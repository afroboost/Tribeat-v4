import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { BuySessionAccessClient } from './ui';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuySessionAccessPage({ params }: Props) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/sessions/${id}/buy`);
  }

  const liveSession = await prisma.session.findUnique({
    where: { id },
    select: { id: true, title: true, coach: { select: { name: true } } },
  });
  if (!liveSession) notFound();

  const offers = await prisma.offer.findMany({
    where: { isActive: true, sessionId: id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <BuySessionAccessClient
      sessionId={id}
      sessionTitle={liveSession.title}
      coachName={liveSession.coach.name}
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

