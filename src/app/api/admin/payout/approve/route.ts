import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const payoutId = String(body?.payoutId ?? '');
  if (!payoutId) {
    return NextResponse.json({ error: 'payoutId requis' }, { status: 400 });
  }

  try {
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
    }

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { ledgerEntry: true, coach: { select: { stripeConnectAccountId: true } } },
    });

    if (!payout) return NextResponse.json({ error: 'Payout introuvable' }, { status: 404 });
    if (payout.status !== 'PENDING') return NextResponse.json({ error: 'Payout déjà traité' }, { status: 409 });
    if (!payout.ledgerEntry) return NextResponse.json({ error: 'Ledger manquant' }, { status: 500 });

    const acctId = payout.coach.stripeConnectAccountId;
    if (!acctId) {
      return NextResponse.json({ error: 'Coach non onboardé Stripe Connect' }, { status: 400 });
    }

    // Ledger consistency checks (ledger is immutable)
    const le = payout.ledgerEntry;
    if (le.type !== 'PAYOUT') return NextResponse.json({ error: 'Type ledger invalide' }, { status: 500 });
    if (le.userId !== payout.coachId) return NextResponse.json({ error: 'Coach ledger mismatch' }, { status: 500 });
    if (le.currency !== payout.currency) return NextResponse.json({ error: 'Devise ledger invalide' }, { status: 500 });
    if (le.amount !== -payout.amount) return NextResponse.json({ error: 'Montant ledger invalide' }, { status: 500 });

    // Mark payout as PROCESSING before calling Stripe (prevents double-trigger).
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        approvedAt: new Date(),
        approvedById: session.user.id,
        stripeConnectAccountId: acctId,
      },
    });

    // 1 payout = 1 transfer (to connected balance) + 1 payout (to bank)
    const idempotencyBase = `payout_${payoutId}`;
    let transfer: Stripe.Transfer | null = null;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: payout.amount,
          currency: payout.currency.toLowerCase(),
          destination: acctId,
          metadata: { payoutId },
        },
        { idempotencyKey: `${idempotencyBase}_transfer` }
      );
    } catch (err) {
      console.error('[PAYOUT APPROVE] Transfer error:', err);
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          failureReason: 'transfer_failed',
        },
      });
      return NextResponse.json({ error: 'Stripe transfer failed' }, { status: 502 });
    }

    let stripePayout: Stripe.Payout;
    try {
      stripePayout = await stripe.payouts.create(
        {
          amount: payout.amount,
          currency: payout.currency.toLowerCase(),
          metadata: { payoutId },
        },
        { stripeAccount: acctId, idempotencyKey: `${idempotencyBase}_payout` }
      );
    } catch (err) {
      console.error('[PAYOUT APPROVE] Payout error:', err);
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          stripeTransferId: transfer?.id || null,
          failureReason: 'payout_failed',
        },
      });
      return NextResponse.json({ error: 'Stripe payout failed' }, { status: 502 });
    }

    // Update payout with Stripe IDs; final status comes from webhook.
    const updated = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        stripeTransferId: transfer?.id || null,
        stripePayoutId: stripePayout.id,
      },
    });

    return NextResponse.json({ payout: updated, stripe: { transferId: transfer?.id, payoutId: stripePayout.id } });
  } catch (error) {
    console.error('[PAYOUT APPROVE] Error:', error);
    return NextResponse.json({ error: 'Erreur lors de l’approbation' }, { status: 500 });
  }
}

