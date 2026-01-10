import { prisma } from '@/lib/prisma';
import { stripe, isStripeEnabled, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import type Stripe from 'stripe';
import type { StartCheckoutInput, StartCheckoutResult } from '../types';
import { ensureCoachBalance, getPlatformCommissionPercent, splitRevenue } from '@/lib/monetization';

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

  // Handle subscription lifecycle + one-time payments.
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.expired' &&
    event.type !== 'customer.subscription.updated' &&
    event.type !== 'customer.subscription.deleted'
  ) {
    return { status: 200, body: { received: true } };
  }

  // Subscription update/delete events
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    const providerSubscriptionId = sub.id;
    const userId = (sub.metadata as any)?.userId as string | undefined;
    if (!userId) return { status: 200, body: { received: true } };

    const status =
      event.type === 'customer.subscription.deleted'
        ? 'CANCELED'
        : sub.status === 'active'
          ? 'ACTIVE'
          : 'EXPIRED';

    const item = sub.items?.data?.[0];
    const currentPeriodStart = new Date(((item as any)?.current_period_start ?? sub.created) * 1000);
    const currentPeriodEnd = new Date(((item as any)?.current_period_end ?? sub.created) * 1000);

    await prisma.coachSubscription.upsert({
      where: { providerSubscriptionId },
      update: {
        userId,
        status: status as any,
        provider: 'STRIPE',
        currentPeriodStart,
        currentPeriodEnd,
      },
      create: {
        userId,
        status: status as any,
        provider: 'STRIPE',
        providerSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    // Ensure coach balance exists (even before any session payment)
    await ensureCoachBalance(userId);

    // Promote user to COACH only when subscription is ACTIVE
    if (status === 'ACTIVE') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'COACH' },
      }).catch(() => null);
    }

    return { status: 200, body: { received: true } };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const transactionId = session.metadata?.transactionId;
  const kind = session.metadata?.kind; // 'coach_subscription' | undefined

  // Coach subscription checkout completed (Stripe subscription via Checkout)
  if (event.type === 'checkout.session.completed' && kind === 'coach_subscription') {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string | null;
    if (!userId || !subscriptionId) return { status: 200, body: { received: true } };

    // Retrieve subscription to get period dates
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const item = (sub as any).items?.data?.[0];
    const currentPeriodStart = new Date(((item as any)?.current_period_start ?? sub.created) * 1000);
    const currentPeriodEnd = new Date(((item as any)?.current_period_end ?? sub.created) * 1000);
    await prisma.coachSubscription.upsert({
      where: { providerSubscriptionId: subscriptionId },
      update: {
        userId,
        status: 'ACTIVE',
        provider: 'STRIPE',
        currentPeriodStart,
        currentPeriodEnd,
      },
      create: {
        userId,
        status: 'ACTIVE',
        provider: 'STRIPE',
        providerSubscriptionId: subscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    await ensureCoachBalance(userId);
    await prisma.user.update({ where: { id: userId }, data: { role: 'COACH' } }).catch(() => null);
    return { status: 200, body: { received: true } };
  }

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
    await prisma.$transaction(async (db) => {
      const access = await db.userAccess.create({
        data: {
          userId: tx.userId,
          offerId: tx.offerId,
          sessionId: tx.offer?.sessionId || null,
          transactionId: tx.id,
          status: 'ACTIVE',
          grantedAt: new Date(),
        },
      });

      // If offer is linked to a session, record session payment + update balances.
      const sessionId = tx.offer?.sessionId;
      if (sessionId) {
        const liveSession = await db.session.findUnique({
          where: { id: sessionId },
          select: { coachId: true },
        });
        if (liveSession?.coachId) {
          const pct = await getPlatformCommissionPercent();
          const { platformCut, coachCut, commissionPercent } = splitRevenue(tx.amount, pct);

          await db.sessionPayment.create({
            data: {
              sessionId,
              participantId: tx.userId,
              amount: tx.amount,
              currency: tx.currency,
              provider: tx.provider,
              status: 'PAID',
              platformCut,
              coachCut,
              commissionPercent,
              transactionId: tx.id,
            },
          });

          await db.coachBalance.upsert({
            where: { coachId: liveSession.coachId },
            update: {
              availableAmount: { increment: coachCut },
              totalEarned: { increment: coachCut },
              // pendingAmount stays 0 until payouts phase
            },
            create: {
              coachId: liveSession.coachId,
              availableAmount: coachCut,
              pendingAmount: 0,
              totalEarned: coachCut,
              currency: tx.currency,
            },
          });
        }
      }

      return access;
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

