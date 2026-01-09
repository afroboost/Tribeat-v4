/**
 * Page Admin - Gestion des Sessions
 */

import { SessionList } from '@/components/admin/SessionList';
import { getAllSessions } from '@/actions/sessions';
import { getAllUsers } from '@/actions/users';

// FORCE DYNAMIC
export const dynamic = 'force-dynamic';

export default async function AdminSessionsPage() {
  let sessions: any[] = [];
  let coaches: any[] = [];

  try {
    const [sessionsResult, usersResult] = await Promise.all([
      getAllSessions(),
      getAllUsers(),
    ]);
    sessions = sessionsResult.success ? (sessionsResult.data || []) : [];
    coaches = usersResult.success 
      ? (usersResult.data?.filter((u: any) => u.role === 'COACH' || u.role === 'SUPER_ADMIN') || [])
      : [];
  } catch (e) {
    console.error('DB Error:', e);
  }

  return (
    <div className="space-y-6">
      <h1 style={{ color: 'red', fontSize: '24px', fontWeight: 'bold' }}>RENDER OK — SESSIONS</h1>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900">🎥 Gestion des Sessions</h2>
        <p className="mt-2 text-gray-600">Créez, modifiez et supprimez les sessions live.</p>
      </div>

      <SessionList initialSessions={sessions} coaches={coaches} />
    </div>
  );
}
