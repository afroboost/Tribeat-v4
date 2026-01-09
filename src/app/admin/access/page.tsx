/**
 * Admin - Gestion des Accès
 * CRUD complet pour gérer les accès utilisateurs aux sessions
 */

import { getAccesses } from '@/actions/access';
import { prisma } from '@/lib/prisma';
import { AccessManager } from '@/components/admin/AccessManager';

export default async function AccessPage() {
  const [accessesResult, sessions, users] = await Promise.all([
    getAccesses(),
    prisma.session.findMany({
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const accesses = accessesResult.success ? (accessesResult.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Accès
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gérez les accès des utilisateurs aux sessions
        </p>
      </div>

      <AccessManager 
        accesses={accesses} 
        sessions={sessions} 
        users={users} 
      />
    </div>
  );
}
