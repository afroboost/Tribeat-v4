import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { getActiveCoachSubscription } from '@/lib/monetization';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (session.user.role === 'COACH') {
      const sub = await getActiveCoachSubscription(session.user.id);
      if (!sub) {
        return NextResponse.json({ error: 'Abonnement coach requis' }, { status: 403 });
      }
    }

    const coachId = session.user.id;
    const balance = await prisma.coachBalance.findUnique({ where: { coachId } });
    const perSession = await prisma.sessionPayment.groupBy({
      by: ['sessionId'],
      where: { session: { coachId }, status: 'PAID' },
      _sum: { amount: true, coachCut: true, platformCut: true },
      _count: { _all: true },
    });

    return NextResponse.json({ success: true, balance, perSession });
  } catch (error) {
    console.error('[API][COACH][EARNINGS] error', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

