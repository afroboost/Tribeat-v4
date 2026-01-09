'use client';

/**
 * AccessManager Component
 * UI pour gérer les UserAccess (payants)
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  createManualAccess, 
  revokeAccess,
  reactivateAccess,
  deleteAccess 
} from '@/actions/access';
import { Trash2, Plus, Users, Shield, Ban, RefreshCw } from 'lucide-react';

interface Access {
  id: string;
  userId: string;
  sessionId: string | null;
  offerId: string | null;
  transactionId: string | null;
  status: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  user: { id: string; name: string; email: string };
  session?: { id: string; title: string } | null;
  transaction?: { id: string; amount: number; provider: string } | null;
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
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Créer un accès manuel (gratuit)
  const handleAdd = async () => {
    if (!selectedUser) {
      toast.error('Sélectionnez un utilisateur');
      return;
    }

    setIsLoading(true);
    const result = await createManualAccess(
      selectedUser, 
      selectedSession || undefined
    );
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès créé');
      window.location.reload();
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Révoquer un accès
  const handleRevoke = async (accessId: string) => {
    if (!confirm('Révoquer cet accès ?')) return;

    setIsLoading(true);
    const result = await revokeAccess(accessId);
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès révoqué');
      setAccesses(accesses.map(a => 
        a.id === accessId ? { ...a, status: 'REVOKED', revokedAt: new Date().toISOString() } : a
      ));
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Réactiver un accès
  const handleReactivate = async (accessId: string) => {
    setIsLoading(true);
    const result = await reactivateAccess(accessId);
    setIsLoading(false);

    if (result.success) {
      toast.success('Accès réactivé');
      setAccesses(accesses.map(a => 
        a.id === accessId ? { ...a, status: 'ACTIVE', revokedAt: null } : a
      ));
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Supprimer un accès
  const handleDelete = async (accessId: string) => {
    if (!confirm('Supprimer définitivement cet accès ?')) return;

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

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-800' },
    EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-800' },
    REVOKED: { label: 'Révoqué', color: 'bg-red-100 text-red-800' },
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
          Ajouter un accès manuel
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouvel accès (gratuit/manuel)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Utilisateur *</label>
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
                <label className="block text-sm font-medium mb-1">Session (optionnel)</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="access-session-select"
                >
                  <option value="">Toutes les sessions</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Un accès sans session = accès global à toutes les sessions.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isLoading} data-testid="confirm-add-access">
                {isLoading ? 'Création...' : 'Créer l\'accès'}
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
            Accès utilisateurs ({accesses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accesses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun accès configuré. Les accès sont créés automatiquement après un paiement validé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Utilisateur</th>
                    <th className="text-left p-3 font-medium">Session</th>
                    <th className="text-left p-3 font-medium">Origine</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map((access) => {
                    const status = statusConfig[access.status] || statusConfig.PENDING;
                    return (
                      <tr key={access.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{access.user.name}</p>
                            <p className="text-sm text-gray-500">{access.user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          {access.session ? (
                            <p>{access.session.title}</p>
                          ) : (
                            <Badge variant="outline">Global</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {access.transaction ? (
                            <Badge variant="default">
                              {access.transaction.provider} - {(access.transaction.amount / 100).toFixed(2)} CHF
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Manuel</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-sm ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(access.grantedAt).toLocaleDateString('fr-FR')}
                          {access.revokedAt && (
                            <p className="text-red-500">
                              Révoqué: {new Date(access.revokedAt).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {access.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(access.id)}
                                className="text-orange-600"
                                title="Révoquer"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            {access.status === 'REVOKED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(access.id)}
                                className="text-green-600"
                                title="Réactiver"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(access.id)}
                              className="text-red-600"
                              title="Supprimer"
                              data-testid={`delete-access-${access.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
