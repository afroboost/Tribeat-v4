'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type UserLite = { id: string; email: string; name: string };
type SessionLite = { id: string; title: string };
type Grant = {
  id: string;
  userId: string;
  sessionId: string | null;
  grantedAt: string;
  revokedAt: string | null;
  user: UserLite;
  session: SessionLite | null;
};

export function FreeAccessManager(props: { users: UserLite[]; sessions: SessionLite[]; grants: Grant[] }) {
  const [userId, setUserId] = useState(props.users[0]?.id || '');
  const [sessionId, setSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grants, setGrants] = useState<Grant[]>(props.grants);

  async function grant() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/free-access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId: sessionId || null, reason: reason || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      // Simplest: refetch grants list is avoided; append minimal and reload page is okay.
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function revoke(grantId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/free-access-grants/${grantId}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      setGrants(grants.map((g) => (g.id === grantId ? { ...g, revokedAt: new Date().toISOString() } : g)));
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grant free access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>User</Label>
              <select className="w-full border rounded-md p-2" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {props.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Session scope</Label>
              <select
                className="w-full border rounded-md p-2"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Global</option>
                {props.sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason (optional)</Label>
              <input className="w-full border rounded-md p-2" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button onClick={grant} disabled={loading || !userId}>
            {loading ? '...' : 'Grant'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing grants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {grants.length === 0 ? (
            <p className="text-sm text-gray-600">Aucun grant.</p>
          ) : (
            grants.map((g) => (
              <div key={g.id} className="border rounded-md p-3 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <div>
                    {g.user.email} — scope: {g.session ? g.session.title : 'global'}
                  </div>
                  <div className="text-xs text-gray-600">
                    grantedAt: {new Date(g.grantedAt).toLocaleString()} {g.revokedAt ? `— revoked` : ''}
                  </div>
                </div>
                <Button variant="outline" disabled={loading || !!g.revokedAt} onClick={() => revoke(g.id)}>
                  Révoquer
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

