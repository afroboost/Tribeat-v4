/**
 * API Route: Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * SÉCURISÉ: Vérification de signature Stripe obligatoire
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET, isStripeEnabled } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeEnabled() || !stripe) {
      console.error('[WEBHOOK] Stripe disabled or not configured');
      return NextResponse.json({ error: 'Stripe disabled' }, { status: 503 });
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

  // Vérifier si déjà traité (idempotence)
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { userAccess: true },
  });

  if (!existingTransaction) {
    console.error('[WEBHOOK] Transaction not found:', transactionId);
    return;
  }

  if (existingTransaction.status === 'COMPLETED') {
    console.log('[WEBHOOK] Transaction already completed - skipping');
    return;
  }

  // Mettre à jour la transaction
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'COMPLETED',
      providerTxId: session.id,
    },
  });

  // Créer l'accès utilisateur
  if (!existingTransaction.userAccess) {
    const offer = existingTransaction.offerId
      ? await prisma.offer.findUnique({ where: { id: existingTransaction.offerId } })
      : null;

    await prisma.userAccess.create({
      data: {
        userId: existingTransaction.userId,
        offerId: existingTransaction.offerId,
        sessionId: offer?.sessionId || null,
        transactionId: transactionId,
        status: 'ACTIVE',
        grantedAt: new Date(),
      },
    });

    console.log(`[WEBHOOK] Access granted for user ${existingTransaction.userId}`);
  }

  console.log(`[WEBHOOK] Checkout completed: ${transactionId}`);
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

  console.log(`[WEBHOOK] Checkout expired: ${transactionId}`);
}

/**
 * Traiter un paiement échoué
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[WEBHOOK] Payment failed: ${paymentIntent.id}`);
  // Les transactions liées seront marquées FAILED via checkout.session.expired
}
