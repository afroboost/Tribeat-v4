import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ promoCodeId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const { promoCodeId } = await params;

  try {
    const body = await request.json();

    const updated = await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: {
        description: body?.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
        startsAt: body?.startsAt !== undefined ? (body.startsAt ? new Date(String(body.startsAt)) : null) : undefined,
        endsAt: body?.endsAt !== undefined ? (body.endsAt ? new Date(String(body.endsAt)) : null) : undefined,
        maxRedemptions:
          body?.maxRedemptions !== undefined
            ? body.maxRedemptions === null
              ? null
              : Number(body.maxRedemptions)
            : undefined,
        sessionId: body?.sessionId !== undefined ? (body.sessionId ? String(body.sessionId) : null) : undefined,
      },
    });

    return NextResponse.json({ promo: updated });
  } catch (error) {
    console.error('[ADMIN PROMO CODES] Update error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

