import { prisma } from '@/lib/prisma';

/**
 * Authoritative balances are computed from immutable LedgerEntry rows.
 * Amount is signed cents: CREDIT is positive, DEBIT is negative.
 */
export async function getPlatformBalance(currency: string = 'CHF'): Promise<number> {
  const agg = await prisma.ledgerEntry.aggregate({
    where: {
      currency,
      userId: null,
      type: 'PLATFORM_REVENUE',
    },
    _sum: { amount: true },
  });

  return agg._sum.amount || 0;
}

export async function getCoachEarnings(coachId: string, currency: string = 'CHF'): Promise<number> {
  const agg = await prisma.ledgerEntry.aggregate({
    where: {
      currency,
      userId: coachId,
      type: 'COACH_EARNING',
    },
    _sum: { amount: true },
  });

  return agg._sum.amount || 0;
}

