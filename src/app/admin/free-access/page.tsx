import { prisma } from '@/lib/prisma';
import { FreeAccessManager } from '@/components/admin/FreeAccessManager';

export const dynamic = 'force-dynamic';

export default async function AdminFreeAccessPage() {
  const [users, sessions, grants] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: { createdAt: 'desc' } }),
    prisma.session.findMany({ select: { id: true, title: true }, orderBy: { createdAt: 'desc' } }),
    prisma.freeAccessGrant.findMany({
      orderBy: { grantedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        session: { select: { id: true, title: true } },
      },
    }),
  ]);

  return <FreeAccessManager users={users} sessions={sessions} grants={grants as any} />;
}

