import { prisma } from '@/lib/prisma';
import { stripe, isStripeEnabled, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import type Stripe from 'stripe';
import type { StartCheckoutInput, StartCheckoutResult } from '../types';

function isTwintEnabled(): boolean {
  return process.env.ENABLE_TWINT === 'true' && isStripeEnabled();
}

export async function startStripeCheckout(
  input: StartCheckoutInput & { provider: 'STRIPE' | 'TWINT' }
): Promise<StartCheckoutResult> {
  if (!isStripeEnabled() || !stripe) {
    throw new Error('Stripe disabled');
  }

  if (input.provider === 'TWINT' && !isTwintEnabled()) {
    throw new Error('TWINT disabled');
  }

  const offer = await prisma.offer.findUnique({
    where: { id: input.offerId, isActive: true },
    include: { session: { select: { title: true } } },
  });

  if (!offer) throw new Error('Offer not found');

  // Create PENDING transaction
  const tx = await prisma.transaction.create({
    data: {
      userId: input.userId,
      offerId: offer.id,
      amount: offer.price,
      currency: offer.currency,
      provider: input.provider,
      status: 'PENDING',
      metadata: {
        offerName: offer.name,
        sessionTitle: offer.session?.title || null,
        userEmail: input.userEmail,
      },
    },
  });

  const successUrl = `${input.origin}/checkout/success?tx=${tx.id}`;
  const cancelUrl = `${input.origin}/checkout/cancel?tx=${tx.id}`;

  let checkoutSession: Stripe.Checkout.Session;
  try {
    // Stripe Checkout
    checkoutSession = await stripe.checkout.sessions.create({
      // For TWINT, we constrain methods; for STRIPE we keep card default.
      payment_method_types: input.provider === 'TWINT' ? (['twint'] as any) : ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: offer.currency.toLowerCase(),
            product_data: {
              name: offer.name,
              description: offer.description || undefined,
            },
            unit_amount: offer.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.userEmail || undefined,
      metadata: {
        transactionId: tx.id,
        offerId: offer.id,
        userId: input.userId,
        provider: input.provider,
      },
    });
  } catch (error) {
    console.error('[STRIPE] checkout session creation failed', error);
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: 'FAILED' },
    });
    throw new Error('Stripe checkout unavailable');
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { providerTxId: checkoutSession.id },
  });

  if (!checkoutSession.url) throw new Error('Stripe checkout URL missing');

  return { checkoutUrl: checkoutSession.url, providerReference: checkoutSession.id };
}

export async function handleStripeWebhook(request: Request) {
  if (!isStripeEnabled() || !stripe) {
    return { status: 503, body: { error: 'Stripe disabled' } };
  }

  const signature = request.headers.get('stripe-signature');
  const body = await request.text();

  let event: Stripe.Event;
  if (STRIPE_WEBHOOK_SECRET) {
    if (!signature) return { status: 400, body: { error: 'Missing signature' } };
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[STRIPE][WEBHOOK] Signature verification failed', err);
      return { status: 400, body: { error: 'Invalid signature' } };
    }
  } else {
    // Allowed per requirements: verify only if secret present
    console.warn('[STRIPE][WEBHOOK] No webhook secret - skipping signature verification');
    event = JSON.parse(body) as Stripe.Event;
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
    return { status: 200, body: { received: true } };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const transactionId = session.metadata?.transactionId;
  if (!transactionId) return { status: 200, body: { received: true } };

  // Idempotent: load tx + access
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { userAccess: true, offer: true },
  });
  if (!tx) return { status: 200, body: { received: true } };

  if (event.type === 'checkout.session.expired') {
    if (tx.status !== 'COMPLETED') {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'CANCELLED', providerTxId: session.id },
      });
    }
    return { status: 200, body: { received: true } };
  }

  // completed
  if (tx.status !== 'COMPLETED') {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: 'COMPLETED', providerTxId: session.id },
    });
  }

  // Access created only via webhook
  if (!tx.userAccess) {
    await prisma.userAccess.create({
      data: {
        userId: tx.userId,
        offerId: tx.offerId,
        sessionId: tx.offer?.sessionId || null,
        transactionId: tx.id,
        status: 'ACTIVE',
        grantedAt: new Date(),
      },
    });
  }

  return { status: 200, body: { received: true } };
}

export function isStripeProviderEnabled() {
  return process.env.ENABLE_STRIPE === 'true' && isStripeEnabled();
}

export function isTwintProviderEnabled() {
  return isTwintEnabled();
}

