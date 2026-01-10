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

    // Hard requirement in production
    if (process.env.NODE_ENV === 'production' && !STRIPE_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET is required in production');
      return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
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

      default:
        // no-op
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

  // Vérifier si déjà traité (idempotence)
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { userAccess: true },
  });

  if (!existingTransaction) {
    console.error('[WEBHOOK] Transaction not found:', transactionId);
    return;
  }

  // Resolve coachId (if the offer is tied to a session)
  const offer = existingTransaction.offerId
    ? await prisma.offer.findUnique({
        where: { id: existingTransaction.offerId },
        select: { sessionId: true },
      })
    : null;

  const coach = offer?.sessionId
    ? await prisma.session.findUnique({
        where: { id: offer.sessionId },
        select: { coachId: true },
      })
    : null;

  // Revenue split (default 0% platform fee unless configured)
  const feeBpsRaw = Number(process.env.PLATFORM_FEE_BPS ?? '0');
  const feeBps = Number.isFinite(feeBpsRaw) ? Math.min(10000, Math.max(0, Math.trunc(feeBpsRaw))) : 0;
  const platformRevenue = Math.round((existingTransaction.amount * feeBps) / 10000);
  const coachEarning = existingTransaction.amount - platformRevenue;

  await prisma.$transaction(async (tx) => {
    // Ensure transaction is marked completed (idempotent)
    if (existingTransaction.status !== 'COMPLETED') {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          providerTxId: session.id,
        },
      });
    }

    // Ensure SessionPayment is PAID (idempotent)
    await tx.sessionPayment.upsert({
      where: { transactionId },
      create: {
        transactionId,
        stripeSessionId: session.id,
        status: 'PAID',
        amount: existingTransaction.amount,
        currency: existingTransaction.currency,
      },
      update: {
        stripeSessionId: session.id,
        status: 'PAID',
        amount: existingTransaction.amount,
        currency: existingTransaction.currency,
      },
    });

    // Create access (idempotent: transactionId is unique in UserAccess)
    if (!existingTransaction.userAccess) {
      await tx.userAccess.create({
        data: {
          userId: existingTransaction.userId,
          offerId: existingTransaction.offerId,
          sessionId: offer?.sessionId || null,
          transactionId: transactionId,
          status: 'ACTIVE',
          grantedAt: new Date(),
        },
      });
    }

    // Ledger entries (idempotent via @@unique([transactionId, type]))
    await tx.ledgerEntry.upsert({
      where: { transactionId_type: { transactionId, type: 'PLATFORM_REVENUE' } },
      create: {
        transactionId,
        type: 'PLATFORM_REVENUE',
        amount: platformRevenue,
        userId: null,
      },
      update: {
        amount: platformRevenue,
      },
    });

    await tx.ledgerEntry.upsert({
      where: { transactionId_type: { transactionId, type: 'COACH_EARNING' } },
      create: {
        transactionId,
        type: 'COACH_EARNING',
        amount: coachEarning,
        userId: coach?.coachId || null,
      },
      update: {
        amount: coachEarning,
        userId: coach?.coachId || null,
      },
    });
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

}

/**
 * Traiter un paiement échoué
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  void paymentIntent;
  // Les transactions liées seront marquées FAILED via checkout.session.expired
}
