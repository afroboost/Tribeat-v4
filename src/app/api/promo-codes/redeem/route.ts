import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = normalizeCode(String(body?.code ?? ''));

    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        type: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        maxRedemptions: true,
        sessionId: true,
      },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) {
      return NextResponse.json({ error: 'Code pas encore actif' }, { status: 400 });
    }
    if (promo.endsAt && promo.endsAt < now) {
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 });
    }

    // PHASE 1B: seul FULL_FREE donne un accès (les autres types seront traités côté paiement plus tard)
    if (promo.type !== 'FULL_FREE') {
      return NextResponse.json({ error: 'Code non applicable (PHASE 1)' }, { status: 400 });
    }

    // Phase 1: un promo code peut être global OU scope à une session.
    // Si scope session, le client ne choisit pas une autre session.
    if (body?.sessionId && promo.sessionId && String(body.sessionId) !== promo.sessionId) {
      return NextResponse.json({ error: 'Code non valide pour cette session' }, { status: 400 });
    }
    if (body?.sessionId && !promo.sessionId) {
      return NextResponse.json({ error: 'Ce code est global (sessionId non accepté)' }, { status: 400 });
    }

    const redemption = await prisma.$transaction(async (tx) => {
      // Déjà utilisé par cet utilisateur ?
      const existing = await tx.promoRedemption.findUnique({
        where: {
          promoCodeId_userId: {
            promoCodeId: promo.id,
            userId: session.user.id,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new Error('ALREADY_REDEEMED');
      }

      // Max redemptions global ?
      if (promo.maxRedemptions !== null) {
        const count = await tx.promoRedemption.count({
          where: { promoCodeId: promo.id },
        });
        if (count >= promo.maxRedemptions) {
          throw new Error('MAX_REDEMPTIONS_REACHED');
        }
      }

      return await tx.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          userId: session.user.id,
          promoType: promo.type,
          sessionId: promo.sessionId ?? null,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        promoCode: promo.code,
        redemption,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PROMO REDEEM] Error:', error);
    if (error instanceof Error && error.message === 'ALREADY_REDEEMED') {
      return NextResponse.json({ error: 'Code déjà utilisé' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'MAX_REDEMPTIONS_REACHED') {
      return NextResponse.json({ error: 'Code épuisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur lors de la redemption' }, { status: 500 });
  }
}

