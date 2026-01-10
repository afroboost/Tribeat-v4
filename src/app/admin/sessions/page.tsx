/**
 * Page Admin - Gestion des Sessions
 */

import { SessionList } from '@/components/admin/SessionList';
import { getAllSessions } from '@/actions/sessions';
import { getAllUsers } from '@/actions/users';

export const dynamic = 'force-dynamic';

export default async function AdminSessionsPage() {
  const [sessionsResult, usersResult] = await Promise.all([
    getAllSessions().catch(() => ({ success: false, data: [] })),
    getAllUsers().catch(() => ({ success: false, data: [] })),
  ]);

  const sessions = sessionsResult.success ? (sessionsResult.data || []) : [];
  const coaches = usersResult.success 
    ? (usersResult.data?.filter((u: any) => u.role === 'COACH' || u.role === 'SUPER_ADMIN') || [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎥 Gestion des Sessions</h1>
        <p className="mt-2 text-gray-600">Créez, modifiez et supprimez les sessions live.</p>
      </div>

      <SessionList initialSessions={sessions} coaches={coaches} />
    </div>
  );
}
