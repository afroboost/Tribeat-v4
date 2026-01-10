/**
 * Admin - Gestion des Accès
 */

import { getAccesses } from '@/actions/access';
import { prisma } from '@/lib/prisma';
import { AccessManager } from '@/components/admin/AccessManager';

export const dynamic = 'force-dynamic';

export default async function AccessPage() {
  const [accessesResult, sessionsResult, usersResult] = await Promise.all([
    getAccesses().catch(() => ({ success: false, data: [] })),
    prisma.session
      .findMany({
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => {
        console.error('[ADMIN][ACCESS] Failed to load sessions', error);
        return { ok: false as const, data: [] as any[] };
      }),
    prisma.user
      .findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      })
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => {
        console.error('[ADMIN][ACCESS] Failed to load users', error);
        return { ok: false as const, data: [] as any[] };
      }),
  ]);

  const accesses = accessesResult.success ? (accessesResult.data as any[]) : [];
  const sessions = sessionsResult.data;
  const users = usersResult.data;
  const hasLoadError = !accessesResult.success || !sessionsResult.ok || !usersResult.ok;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Accès</h1>
        <p className="text-gray-500">Gérez les accès des utilisateurs aux sessions</p>
      </div>

      {hasLoadError && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Certaines données n&apos;ont pas pu être chargées. Rafraîchissez la page pour réessayer.
        </div>
      )}

      <AccessManager 
        accesses={accesses} 
        sessions={sessions} 
        users={users} 
      />
    </div>
  );
}
