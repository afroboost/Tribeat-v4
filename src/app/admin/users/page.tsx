/**
 * Page Admin - Gestion des Utilisateurs
 */

import { UserList } from '@/components/admin/UserList';
import { getAllUsers } from '@/actions/users';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const result = await getAllUsers().catch(() => ({ success: false, data: [] }));
  const users = result.success ? (result.data || []) : [];
  const hasLoadError = !result.success;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👥 Gestion des Utilisateurs</h1>
        <p className="mt-2 text-gray-600">Modifiez les rôles et gérez les comptes.</p>
      </div>

      {hasLoadError && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Impossible de charger les utilisateurs pour le moment. Rafraîchissez la page pour réessayer.
        </div>
      )}

      <UserList initialUsers={users} />
    </div>
  );
}
