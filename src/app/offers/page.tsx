import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { OffersCheckoutClient } from './ui';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/auth/login?callbackUrl=/offers');
  }

  const offers = await prisma.offer.findMany({
    where: { isActive: true, sessionId: null },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <OffersCheckoutClient
      offers={offers.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        price: o.price,
        currency: o.currency,
      }))}
    />
  );
}

