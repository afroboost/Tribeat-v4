/**
 * Page Admin - Gestion des Utilisateurs
 * Changement de rôles et gestion des comptes
 */

import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserList } from '@/components/admin/UserList';
import { getAllUsers } from '@/actions/users';

export default async function AdminUsersPage() {
  const result = await getAllUsers();
  const users = result.success ? result.data : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            👥 Gestion des Utilisateurs
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Modifiez les rôles et gérez les comptes utilisateurs.
          </p>
        </div>

        <UserList initialUsers={users || []} />
      </div>
    </AdminLayout>
  );
}
