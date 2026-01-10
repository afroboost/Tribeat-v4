import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { twintAdapter } from '@/lib/payments/providers/twint';
import { validatePromoForOffer } from '@/lib/promos/promoService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

  if (!twintAdapter.enabled()) {
    return NextResponse.json({ error: 'Paiement indisponible' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const offerId = String(body?.offerId ?? '');
  const promoCode = body?.promoCode ? String(body.promoCode) : null;
  if (!offerId) return NextResponse.json({ error: 'offerId requis' }, { status: 400 });

  const offer = await prisma.offer.findUnique({
    where: { id: offerId, isActive: true },
    include: { session: { select: { title: true } } },
  });
  if (!offer) return NextResponse.json({ error: 'Offre non trouvée ou inactive' }, { status: 404 });

  if (promoCode) {
    const validation = await validatePromoForOffer({
      code: promoCode,
      userId: session.user.id,
      offer: { id: offer.id, price: offer.price, currency: offer.currency, sessionId: offer.sessionId },
    });
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    if (validation.promo.type === 'FULL_FREE') {
      await prisma.promoRedemption.create({
        data: {
          promoCodeId: validation.promo.id,
          userId: session.user.id,
          promoType: validation.promo.type,
          sessionId: validation.promo.sessionId ?? null,
          discountAmount: validation.discountAmount,
          finalAmount: 0,
          currency: offer.currency,
        },
      });
      return NextResponse.json(
        { bypassed: true, promo: { code: validation.promo.code, type: validation.promo.type }, sessionId: offer.sessionId },
        { status: 200 }
      );
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      offerId: offer.id,
      amount: offer.price,
      currency: offer.currency,
      provider: 'TWINT',
      status: 'PENDING',
      metadata: {
        offerName: offer.name,
        sessionTitle: offer.session?.title || null,
        userEmail: session.user.email,
        provider: 'TWINT',
        note: 'TODO integrate TWINT API',
      },
    },
  });

  const payment = await twintAdapter.createPayment({
    transactionId: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    customerEmail: session.user.email,
    returnUrl: body?.originUrl ? `${String(body.originUrl)}/checkout/success?transaction_id=${transaction.id}` : null,
  });

  return NextResponse.json({ transactionId: transaction.id, payment }, { status: 202 });
}

