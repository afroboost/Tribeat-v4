'use client';

/**
 * AccessManager Component
 * UI pour gérer les accès (ajouter/modifier/supprimer)
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  addAccess, 
  updateAccess, 
  deleteAccess 
} from '@/actions/access';
import { Trash2, Edit2, Plus, Users, Shield } from 'lucide-react';

interface Access {
  id: string;
  userId: string;
  sessionId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
  session: { id: string; title: string; status: string };
}

interface Session {
  id: string;
  title: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AccessManagerProps {
  accesses: Access[];
  sessions: Session[];
  users: User[];
}

export function AccessManager({ accesses: initialAccesses, sessions, users }: AccessManagerProps) {
  const [accesses, setAccesses] = useState(initialAccesses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedRole, setSelectedRole] = useState('PARTICIPANT');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!selectedUser || !selectedSession) {
      toast.error('Sélectionnez un utilisateur et une session');
      return;
    }

    setIsLoading(true);
    const result = await addAccess(selectedUser, selectedSession, selectedRole as any);
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès ajouté');
      setAccesses([result.data as Access, ...accesses]);
      setShowAddForm(false);
      setSelectedUser('');
      setSelectedSession('');
      setSelectedRole('PARTICIPANT');
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  const handleUpdate = async (accessId: string, newRole: string) => {
    setIsLoading(true);
    const result = await updateAccess(accessId, newRole as any);
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès modifié');
      setAccesses(accesses.map(a => 
        a.id === accessId ? { ...a, role: newRole } : a
      ));
      setEditingId(null);
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  const handleDelete = async (accessId: string) => {
    if (!confirm('Supprimer cet accès ?')) return;

    setIsLoading(true);
    const result = await deleteAccess(accessId);
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès supprimé');
      setAccesses(accesses.filter(a => a.id !== accessId));
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  const roleLabels: Record<string, string> = {
    PARTICIPANT: 'Participant',
    MODERATOR: 'Modérateur',
    SPEAKER: 'Speaker',
  };

  return (
    <div className="space-y-6">
      {/* Bouton Ajouter */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="add-access-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un accès
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouvel accès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Utilisateur</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="access-user-select"
                >
                  <option value="">Sélectionner...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="access-session-select"
                >
                  <option value="">Sélectionner...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="access-role-select"
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="MODERATOR">Modérateur</option>
                  <option value="SPEAKER">Speaker</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isLoading} data-testid="confirm-add-access">
                {isLoading ? 'Ajout...' : 'Ajouter'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des accès */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Accès existants ({accesses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accesses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun accès configuré</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Utilisateur</th>
                    <th className="text-left p-3 font-medium">Session</th>
                    <th className="text-left p-3 font-medium">Rôle</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map((access) => (
                    <tr key={access.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{access.user.name}</p>
                          <p className="text-sm text-gray-500">{access.user.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <p>{access.session.title}</p>
                        <p className="text-xs text-gray-500">{access.session.status}</p>
                      </td>
                      <td className="p-3">
                        {editingId === access.id ? (
                          <select
                            defaultValue={access.role}
                            onChange={(e) => handleUpdate(access.id, e.target.value)}
                            className="p-1 border rounded"
                            data-testid={`edit-role-${access.id}`}
                          >
                            <option value="PARTICIPANT">Participant</option>
                            <option value="MODERATOR">Modérateur</option>
                            <option value="SPEAKER">Speaker</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            <Shield className="w-3 h-3" />
                            {roleLabels[access.role] || access.role}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(access.joinedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(editingId === access.id ? null : access.id)}
                            data-testid={`edit-access-${access.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(access.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`delete-access-${access.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
