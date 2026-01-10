import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { mtnMomoAdapter } from '@/lib/payments/providers/mtn';
import { validatePromoForOffer } from '@/lib/promos/promoService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

  if (!mtnMomoAdapter.enabled()) {
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
      provider: 'MTN_MOMO',
      status: 'PENDING',
      metadata: {
        offerName: offer.name,
        sessionTitle: offer.session?.title || null,
        userEmail: session.user.email,
        provider: 'MTN_MOMO',
        note: 'TODO integrate MTN MoMo API',
      },
    },
  });

  const payment = await mtnMomoAdapter.createPayment({
    transactionId: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    customerEmail: session.user.email,
  });

  return NextResponse.json({ transactionId: transaction.id, payment }, { status: 202 });
}

