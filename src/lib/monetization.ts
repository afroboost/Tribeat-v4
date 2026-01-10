import { prisma } from '@/lib/prisma';

const COMMISSION_KEY = 'platform_commission_percent';

export async function getPlatformCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.uI_Settings.findUnique({ where: { key: COMMISSION_KEY } });
    const raw = setting?.value ?? '20';
    const n = Number(raw);
    if (!Number.isFinite(n)) return 20;
    return Math.max(0, Math.min(100, Math.round(n)));
  } catch (error) {
    console.error('[MONETIZATION] Failed to read commission percent', error);
    return 20;
  }
}

export async function getActiveCoachSubscription(userId: string) {
  try {
    const now = new Date();
    return await prisma.coachSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gt: now },
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });
  } catch (error) {
    console.error('[MONETIZATION] Failed to read coach subscription', error);
    return null;
  }
}

export async function ensureCoachBalance(coachId: string) {
  return prisma.coachBalance.upsert({
    where: { coachId },
    update: {},
    create: { coachId, availableAmount: 0, pendingAmount: 0, totalEarned: 0, currency: 'CHF' },
  });
}

export function splitRevenue(amountCents: number, commissionPercent: number) {
  const pct = Math.max(0, Math.min(100, Math.round(commissionPercent)));
  const platformCut = Math.floor((amountCents * pct) / 100);
  const coachCut = Math.max(0, amountCents - platformCut);
  return { platformCut, coachCut, commissionPercent: pct };
}

