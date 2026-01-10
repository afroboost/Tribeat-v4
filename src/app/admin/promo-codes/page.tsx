import { prisma } from '@/lib/prisma';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';

export const dynamic = 'force-dynamic';

export default async function AdminPromoCodesPage() {
  const [promoCodes, sessions] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    }),
    prisma.session.findMany({ select: { id: true, title: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  return <PromoCodeManager promoCodes={promoCodes as any} sessions={sessions} />;
}

