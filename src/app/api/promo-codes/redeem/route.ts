import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { validatePromoForOffer, normalizePromoCode } from '@/lib/promos/promoService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = normalizePromoCode(String(body?.code ?? ''));

    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 });
    }

    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    const offerId = body?.offerId ? String(body.offerId) : null;

    const offer =
      offerId !== null
        ? await prisma.offer.findUnique({ where: { id: offerId, isActive: true }, select: { id: true, price: true, currency: true, sessionId: true } })
        : null;

    const validation = await validatePromoForOffer({
      code,
      userId: session.user.id,
      offer: offer ?? { id: 'redeem', price: 0, currency: 'CHF', sessionId },
    });
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    if (validation.promo.type !== 'FULL_FREE') {
      return NextResponse.json({ error: 'Code non applicable (réservé FREE)' }, { status: 400 });
    }

    const redemption = await prisma.promoRedemption.create({
      data: {
        promoCodeId: validation.promo.id,
        userId: session.user.id,
        promoType: validation.promo.type,
        sessionId: validation.promo.sessionId ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        promoCode: validation.promo.code,
        redemption,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PROMO REDEEM] Error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Code déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur lors de la redemption' }, { status: 500 });
  }
}

