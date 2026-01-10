/**
 * Page Admin - Gestion des Utilisateurs
 */

import { UserList } from '@/components/admin/UserList';
import { getAllUsers } from '@/actions/users';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const result = await getAllUsers().catch(() => ({ success: false, data: [] }));
  const users = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👥 Gestion des Utilisateurs</h1>
        <p className="mt-2 text-gray-600">Modifiez les rôles et gérez les comptes.</p>
      </div>

      <UserList initialUsers={users} />
    </div>
  );
}
