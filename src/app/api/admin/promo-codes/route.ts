import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const promoCodes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { redemptions: true } },
      session: { select: { id: true, title: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ promoCodes });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const codeRaw = String(body?.code ?? '');
    const code = normalizeCode(codeRaw);
    const type = body?.type ? String(body.type) : 'FULL_FREE';

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    if (!['FULL_FREE', 'PERCENT', 'FIXED'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    const promo = await prisma.promoCode.create({
      data: {
        code,
        type: type as any,
        description: body?.description ? String(body.description) : null,
        isActive: body?.isActive === false ? false : true,
        startsAt: body?.startsAt ? new Date(String(body.startsAt)) : null,
        endsAt: body?.endsAt ? new Date(String(body.endsAt)) : null,
        maxRedemptions:
          body?.maxRedemptions === null || body?.maxRedemptions === undefined
            ? null
            : Number(body.maxRedemptions),
        percentOff: body?.percentOff === undefined || body?.percentOff === null ? null : Number(body.percentOff),
        amountOff: body?.amountOff === undefined || body?.amountOff === null ? null : Number(body.amountOff),
        sessionId: body?.sessionId ? String(body.sessionId) : null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN PROMO CODES] Create error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}

