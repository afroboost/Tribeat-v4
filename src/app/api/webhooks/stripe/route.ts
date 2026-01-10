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
      // Mode dev sans webhook secret (accepter mais logger warning)
      console.warn('[WEBHOOK] No webhook secret - skipping signature verification (DEV ONLY)');
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`[WEBHOOK] Event received: ${event.type}`);

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

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
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

  // Idempotence: on considère "wallet traité" si un SessionPayment existe déjà
  const existingPayment = await prisma.sessionPayment.findUnique({
    where: { transactionId },
    select: { id: true },
  });

  if (existingPayment) {
    console.log('[WEBHOOK] SessionPayment already exists - skipping');
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
    if (!sessionId) {
      console.log('[WEBHOOK] No sessionId on offer - skipping wallets');
      return;
    }

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

    // Commission: env percent, default 20%
    const percentRaw = process.env.PLATFORM_COMMISSION_PERCENT;
    const parsedPercent = percentRaw ? Number(percentRaw) : NaN;
    const platformPercent =
      Number.isFinite(parsedPercent) && parsedPercent >= 0 && parsedPercent <= 100 ? parsedPercent : 20;
    const platformCut = Math.round((amount * platformPercent) / 100);
    const coachCut = amount - platformCut;

    // Platform wallet (singleton-ish): one per currency
    const platformWallet = await tx.platformWallet.findFirst({
      where: { currency },
      select: { id: true },
    });
    const platformWalletId = platformWallet?.id;

    if (platformWalletId) {
      await tx.platformWallet.update({
        where: { id: platformWalletId },
        data: {
          balance: { increment: platformCut },
          commissionTotal: { increment: platformCut },
        },
      });
    } else {
      await tx.platformWallet.create({
        data: {
          currency,
          balance: platformCut,
          commissionTotal: platformCut,
        },
      });
    }

    // Coach wallet: unique per coach (foundation = single currency enforced)
    const existingWallet = await tx.coachWallet.findUnique({
      where: { coachId: liveSession.coachId },
      select: { id: true, currency: true },
    });

    if (existingWallet && existingWallet.currency !== currency) {
      throw new Error('COACH_WALLET_CURRENCY_MISMATCH');
    }

    if (existingWallet) {
      await tx.coachWallet.update({
        where: { coachId: liveSession.coachId },
        data: {
          pendingAmount: { increment: coachCut },
        },
      });
    } else {
      await tx.coachWallet.create({
        data: {
          coachId: liveSession.coachId,
          currency,
          pendingAmount: coachCut,
        },
      });
    }

    // SessionPayment record (idempotence gate)
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
  });

  console.log(`[WEBHOOK] Checkout completed + wallets updated: ${transactionId}`);
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
  const existingPayment = await prisma.sessionPayment.findUnique({
    where: { transactionId },
    select: { id: true },
  });

  if (!existingPayment) {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { offer: true },
    });

    const sessionId = tx?.offer?.sessionId;
    if (tx && sessionId) {
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
    }
  }

  console.log(`[WEBHOOK] Checkout expired: ${transactionId}`);
}

/**
 * Traiter un paiement échoué
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[WEBHOOK] Payment failed: ${paymentIntent.id}`);
  // Les transactions liées seront marquées FAILED via checkout.session.expired
}
