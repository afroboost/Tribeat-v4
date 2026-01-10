/**
 * API Route: Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * SÉCURISÉ: Vérification de signature Stripe obligatoire
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { Prisma, PromoCodeType } from '@prisma/client';
import { computeSplit } from '@/lib/wallet/walletService';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error('[WEBHOOK] Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // 1. Récupérer le body raw et la signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[WEBHOOK] Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 2. Vérifier la signature (OBLIGATOIRE en prod)
    let event: Stripe.Event;
    
    if (STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error('[WEBHOOK] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Hard-fail safety: never accept unsigned webhooks in production.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
      }
      event = JSON.parse(body) as Stripe.Event;
    }

    // 3. Traiter les événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        await handleStripePayoutPaid(payout);
        break;
      }
      
      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        await handleStripePayoutFailed(payout);
        break;
      }

      default:
        // ignore
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

/**
 * Traiter un checkout complété avec succès
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const transactionId = session.metadata?.transactionId;
  
  if (!transactionId) {
    console.error('[WEBHOOK] No transactionId in metadata');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Charger transaction + offer/session pour split
    const existingTransaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { userAccess: true, offer: true },
    });

    if (!existingTransaction) {
      console.error('[WEBHOOK] Transaction not found:', transactionId);
      return;
    }

    // Marquer transaction COMPLETED (même si déjà fait ailleurs, on upsert de manière sûre)
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        providerTxId: session.id,
      },
    });

    // Créer UserAccess si absent (ne touche pas les wallets)
    if (!existingTransaction.userAccess) {
      await tx.userAccess.create({
        data: {
          userId: existingTransaction.userId,
          offerId: existingTransaction.offerId,
          sessionId: existingTransaction.offer?.sessionId || null,
          transactionId: transactionId,
          status: 'ACTIVE',
          grantedAt: new Date(),
        },
      });
    }

    // Money flow: only if offer is linked to a session
    const sessionId = existingTransaction.offer?.sessionId;
    if (!sessionId) return;

    const liveSession = await tx.session.findUnique({
      where: { id: sessionId },
      select: { id: true, coachId: true },
    });

    if (!liveSession) {
      console.error('[WEBHOOK] Session not found for payment:', sessionId);
      return;
    }

    const amount = existingTransaction.amount;
    const currency = existingTransaction.currency;

    const { platformCut, coachCut } = computeSplit(amount);

    // SessionPayment record (idempotence gate)
    try {
      await tx.sessionPayment.create({
        data: {
          sessionId: liveSession.id,
          participantId: existingTransaction.userId,
          transactionId: existingTransaction.id,
          amount,
          platformCut,
          coachCut,
          currency,
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
        throw e;
      }
      // If SessionPayment already exists, we still attempt ledger writes below (idempotent),
      // in case a previous run crashed between payment creation and ledger insertion.
    }

    // REAL IMMUTABLE LEDGER: create separate entries for platform and coach (balances derived from these)
    try {
      await tx.ledgerEntry.create({
        data: {
          type: 'PLATFORM_REVENUE',
          amount: platformCut,
          currency,
          userId: null,
          transactionId: existingTransaction.id,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
        throw e;
      }
    }

    try {
      await tx.ledgerEntry.create({
        data: {
          type: 'COACH_EARNING',
          amount: coachCut,
          currency,
          userId: liveSession.coachId,
          transactionId: existingTransaction.id,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
        throw e;
      }
    }

    // Promo redemption (PERCENT/FIXED): consume on successful payment only (auditable)
    const promoMeta = (existingTransaction.metadata as any)?.promo;
    if (promoMeta?.promoCodeId) {
      try {
        await tx.promoRedemption.create({
          data: {
            promoCodeId: String(promoMeta.promoCodeId),
            userId: existingTransaction.userId,
            promoType: promoMeta.type as PromoCodeType,
            sessionId: existingTransaction.offer?.sessionId || null,
            transactionId: existingTransaction.id,
            discountAmount: Number(promoMeta.discountAmount) || null,
            finalAmount: Number(promoMeta.finalAmount) || null,
            currency: existingTransaction.currency,
          },
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
          throw e;
        }
      }
    }
  });

}

/**
 * Traiter un checkout expiré
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const transactionId = session.metadata?.transactionId;
  
  if (!transactionId) return;

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'FAILED' },
  });

  // Foundation: enregistrer un échec de paiement pour session, sans toucher aux wallets
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { offer: true },
  });

  const sessionId = tx?.offer?.sessionId;
  if (tx && sessionId) {
    try {
      await prisma.sessionPayment.create({
        data: {
          sessionId,
          participantId: tx.userId,
          transactionId: tx.id,
          amount: tx.amount,
          platformCut: 0,
          coachCut: 0,
          currency: tx.currency,
          status: 'FAILED',
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // already exists
      } else {
        throw e;
      }
    }
  }

}

/**
 * Traiter un paiement échoué
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Les transactions liées seront marquées FAILED via checkout.session.expired
}

async function handleStripePayoutPaid(payout: Stripe.Payout) {
  if (!payout?.id) return;
  await prisma.payout.updateMany({
    where: { stripePayoutId: payout.id },
    data: { status: 'PAID', paidAt: new Date(), failureReason: null },
  });
}

async function handleStripePayoutFailed(payout: Stripe.Payout) {
  if (!payout?.id) return;
  const failureMessage =
    (payout.failure_message as string | null) ||
    (payout.failure_code as string | null) ||
    'payout_failed';
  await prisma.payout.updateMany({
    where: { stripePayoutId: payout.id },
    data: { status: 'FAILED', failureReason: failureMessage },
  });
}
