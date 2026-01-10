import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const [platformSum, balances, subscriptions] = await Promise.all([
      prisma.sessionPayment.aggregate({ where: { status: 'PAID' }, _sum: { platformCut: true } }),
      prisma.coachBalance.findMany({
        include: { coach: { select: { id: true, name: true, email: true } } },
        orderBy: { totalEarned: 'desc' },
      }),
      prisma.coachSubscription.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      success: true,
      platformRevenueCents: platformSum._sum.platformCut || 0,
      balances,
      subscriptions,
    });
  } catch (error) {
    console.error('[API][ADMIN][REVENUE] error', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

