import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  const grants = await prisma.freeAccessGrant.findMany({
    where: {
      userId: userId || undefined,
      sessionId: sessionId || undefined,
    },
    orderBy: { grantedAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, name: true } },
      session: { select: { id: true, title: true } },
      grantedBy: { select: { id: true, email: true, name: true } },
      revokedBy: { select: { id: true, email: true, name: true } },
      promoRedemption: {
        select: {
          id: true,
          promoCode: { select: { code: true } },
          redeemedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ grants });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body?.userId ?? '');
    const sessionId = body?.sessionId ? String(body.sessionId) : null;

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Idempotent: si un grant actif existe déjà (même scope), le retourner.
    const existing = await prisma.freeAccessGrant.findFirst({
      where: {
        userId,
        sessionId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { grantedAt: 'desc' },
    });

    if (existing) {
      return NextResponse.json({ grant: existing, existed: true });
    }

    const grant = await prisma.freeAccessGrant.create({
      data: {
        userId,
        sessionId,
        source: 'ADMIN',
        reason: body?.reason ? String(body.reason) : null,
        expiresAt: body?.expiresAt ? new Date(String(body.expiresAt)) : null,
        grantedById: session.user.id,
      },
    });

    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN FREE ACCESS] Create error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}

