/**
 * Page Admin - Gestion des Sessions
 * CRUD complet pour les sessions live
 */

import { AdminLayout } from '@/components/admin/AdminLayout';
import { SessionList } from '@/components/admin/SessionList';
import { getAllSessions } from '@/actions/sessions';
import { getAllUsers } from '@/actions/users';

export default async function AdminSessionsPage() {
  const [sessionsResult, usersResult] = await Promise.all([
    getAllSessions(),
    getAllUsers(),
  ]);

  const sessions = sessionsResult.success ? sessionsResult.data : [];
  const coaches = usersResult.success 
    ? usersResult.data?.filter(u => u.role === 'COACH' || u.role === 'SUPER_ADMIN') 
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🎥 Gestion des Sessions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Créez, modifiez et supprimez les sessions live.
          </p>
        </div>

        <SessionList initialSessions={sessions || []} coaches={coaches || []} />
      </div>
    </AdminLayout>
  );
}
