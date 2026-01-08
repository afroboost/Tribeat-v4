/**
 * Session List Component
 * Liste et CRUD des sessions
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createSession, deleteSession } from '@/actions/sessions';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SessionListProps {
  initialSessions: any[];
  coaches: any[];
}

export function SessionList({ initialSessions, coaches }: SessionListProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coachId: coaches[0]?.id || '',
    mediaUrl: '',
    mediaType: 'VIDEO' as 'VIDEO' | 'AUDIO' | 'IMAGE',
    scheduledAt: '',
  });

  const handleCreate = async () => {
    try {
      const result = await createSession(formData);
      if (result.success) {
        toast.success('Session créée');
        setShowForm(false);
        window.location.reload();
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette session ?')) return;
    try {
      const result = await deleteSession(id);
      if (result.success) {
        toast.success('Session supprimée');
        setSessions(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Bouton création */}
      <div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="create-session-button">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Session
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Titre</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ma session live"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description..."
              />
            </div>
            <div>
              <Label>Coach</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.coachId}
                onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
              >
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>URL Média (optionnel)</Label>
              <Input
                value={formData.mediaUrl}
                onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Date & Heure</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Créer</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{session.title}</h3>
                  <p className="text-sm text-gray-500">Coach: {session.coach.name}</p>
                  <p className="text-sm text-gray-500">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {formatDate(session.scheduledAt)}
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {session.status}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
