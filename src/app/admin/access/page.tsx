/**
 * Admin - Gestion des Accès
 */

import { getAccesses } from '@/actions/access';
import { prisma } from '@/lib/prisma';
import { AccessManager } from '@/components/admin/AccessManager';

export const dynamic = 'force-dynamic';

export default async function AccessPage() {
  const [accessesResult, sessions, users] = await Promise.all([
    getAccesses().catch(() => ({ success: false, data: [] })),
    prisma.session.findMany({
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }).catch(() => []),
  ]);

  const accesses = accessesResult.success ? (accessesResult.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Accès</h1>
        <p className="text-gray-500">Gérez les accès des utilisateurs aux sessions</p>
      </div>

      <AccessManager 
        accesses={accesses} 
        sessions={sessions} 
        users={users} 
      />
    </div>
  );
}
