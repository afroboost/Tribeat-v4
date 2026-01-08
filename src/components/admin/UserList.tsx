/**
 * User List Component
 * Gestion utilisateurs et changement de rôles
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateUserRole, deleteUser } from '@/actions/users';
import { Trash2, Shield } from 'lucide-react';
import type { UserRole } from '@prisma/client';

interface UserListProps {
  initialUsers: any[];
}

export function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState(initialUsers);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const result = await updateUserRole({ userId, role: newRole });
      if (result.success) {
        toast.success('Rôle mis à jour');
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        toast.success('Utilisateur supprimé');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'COACH':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user._count.coachedSessions} sessions coachées
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {/* Changement de rôle */}
                <select
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  data-testid={`user-role-select-${user.id}`}
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="COACH">Coach</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(user.id)}
                  data-testid={`delete-user-${user.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
