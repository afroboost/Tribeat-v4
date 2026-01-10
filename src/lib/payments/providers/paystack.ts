import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type { StartCheckoutInput, StartCheckoutResult } from '../types';

function paystackEnabled(): boolean {
  // Support both flags: new (ENABLE_MOBILE_MONEY) and legacy alias (ENABLE_PAYSTACK)
  const enabled =
    process.env.ENABLE_MOBILE_MONEY === 'true' || process.env.ENABLE_PAYSTACK === 'true';
  return enabled && !!process.env.PAYSTACK_SECRET_KEY;
}

function getPaystackSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('Paystack secret missing');
  return secret;
}

export async function startPaystackCheckout(input: StartCheckoutInput & { provider: 'MOBILE_MONEY' }): Promise<StartCheckoutResult> {
  if (!paystackEnabled()) throw new Error('Mobile money disabled');

  const offer = await prisma.offer.findUnique({
    where: { id: input.offerId, isActive: true },
    include: { session: { select: { title: true } } },
  });
  if (!offer) throw new Error('Offer not found');

  const tx = await prisma.transaction.create({
    data: {
      userId: input.userId,
      offerId: offer.id,
      amount: offer.price,
      currency: offer.currency,
      provider: 'MOBILE_MONEY',
      status: 'PENDING',
      metadata: {
        offerName: offer.name,
        sessionTitle: offer.session?.title || null,
        userEmail: input.userEmail,
      },
    },
  });

  const callbackUrl = `${input.origin}/checkout/success?tx=${tx.id}`;

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getPaystackSecret()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.userEmail,
      amount: offer.price, // already in smallest unit (centimes)
      currency: offer.currency,
      callback_url: callbackUrl,
      metadata: {
        transactionId: tx.id,
        offerId: offer.id,
        userId: input.userId,
        provider: 'MOBILE_MONEY',
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.status || !data?.data?.authorization_url || !data?.data?.reference) {
    console.error('[PAYSTACK] initialize failed', { status: res.status, data });
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: 'FAILED' },
    });
    throw new Error('Paystack initialize failed');
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { providerTxId: data.data.reference },
  });

  return { checkoutUrl: data.data.authorization_url, providerReference: data.data.reference };
}

export async function handlePaystackWebhook(request: Request) {
  if (!paystackEnabled()) return { status: 503, body: { error: 'Mobile money disabled' } };

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { status: 503, body: { error: 'Paystack not configured' } };

  const signature = request.headers.get('x-paystack-signature');
  const raw = await request.text();

  // Signature validation (HMAC SHA512)
  const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (!signature || hash !== signature) {
    console.error('[PAYSTACK][WEBHOOK] Invalid signature');
    return { status: 400, body: { error: 'Invalid signature' } };
  }

  const event = JSON.parse(raw) as any;
  const type = event?.event;
  const data = event?.data;
  const reference: string | undefined = data?.reference;
  const transactionId: string | undefined = data?.metadata?.transactionId;

  if (!reference && !transactionId) {
    return { status: 200, body: { received: true } };
  }

  // Prefer transactionId from metadata; fallback to provider reference
  const tx = transactionId
    ? await prisma.transaction.findUnique({ where: { id: transactionId }, include: { userAccess: true, offer: true } })
    : await prisma.transaction.findFirst({ where: { providerTxId: reference }, include: { userAccess: true, offer: true } });

  if (!tx) return { status: 200, body: { received: true } };

  if (type === 'charge.success') {
    if (tx.status !== 'COMPLETED') {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'COMPLETED', providerTxId: reference || tx.providerTxId },
      });
    }
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

  if (type === 'charge.failed') {
    if (tx.status === 'PENDING') {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'FAILED', providerTxId: reference || tx.providerTxId },
      });
    }
    return { status: 200, body: { received: true } };
  }

  // Unknown/unhandled event types: acknowledge
  return { status: 200, body: { received: true } };
}

export function isMobileMoneyEnabled() {
  return paystackEnabled();
}

