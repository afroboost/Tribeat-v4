'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Promo = {
  id: string;
  code: string;
  type: 'FULL_FREE' | 'PERCENT' | 'FIXED';
  isActive: boolean;
  sessionId: string | null;
  percentOff: number | null;
  amountOff: number | null;
  maxRedemptions: number | null;
  startsAt: string | null;
  endsAt: string | null;
  _count?: { redemptions: number };
};

export function PromoCodeManager(props: { promoCodes: Promo[]; sessions: { id: string; title: string }[] }) {
  const [promoCodes, setPromoCodes] = useState<Promo[]>(props.promoCodes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    type: 'FULL_FREE' as Promo['type'],
    percentOff: '',
    amountOff: '',
    sessionId: '',
    maxRedemptions: '',
  });

  const isPercent = form.type === 'PERCENT';
  const isFixed = form.type === 'FIXED';

  async function createPromo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          percentOff: isPercent ? Number(form.percentOff) : null,
          amountOff: isFixed ? Number(form.amountOff) : null,
          sessionId: form.sessionId || null,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      setPromoCodes([data.promo, ...promoCodes]);
      setForm({ code: '', type: 'FULL_FREE', percentOff: '', amountOff: '', sessionId: '', maxRedemptions: '' });
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(p: Promo) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/promo-codes/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      setPromoCodes(promoCodes.map((x) => (x.id === p.id ? data.promo : x)));
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  const sessionTitleById = useMemo(() => {
    const m = new Map<string, string>();
    props.sessions.forEach((s) => m.set(s.id, s.title));
    return m;
  }, [props.sessions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Créer un promo code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full border rounded-md p-2"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Promo['type'] })}
              >
                <option value="FULL_FREE">FREE</option>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </select>
            </div>
            {isPercent ? (
              <div className="space-y-2">
                <Label>% off</Label>
                <Input
                  value={form.percentOff}
                  onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
                  placeholder="ex: 20"
                />
              </div>
            ) : null}
            {isFixed ? (
              <div className="space-y-2">
                <Label>Amount off (cents)</Label>
                <Input
                  value={form.amountOff}
                  onChange={(e) => setForm({ ...form, amountOff: e.target.value })}
                  placeholder="ex: 500"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Scope session (optionnel)</Label>
              <select
                className="w-full border rounded-md p-2"
                value={form.sessionId}
                onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
              >
                <option value="">Global</option>
                {props.sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Max redemptions (optionnel)</Label>
              <Input
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                placeholder="ex: 100"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button onClick={createPromo} disabled={loading}>
            {loading ? '...' : 'Créer'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promo codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {promoCodes.length === 0 ? (
            <p className="text-sm text-gray-600">Aucun promo code.</p>
          ) : (
            promoCodes.map((p) => (
              <div key={p.id} className="border rounded-md p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono">{p.code}</div>
                  <div className="text-xs text-gray-600">
                    {p.type}
                    {p.type === 'PERCENT' && p.percentOff ? ` (${p.percentOff}%)` : ''}
                    {p.type === 'FIXED' && p.amountOff ? ` (-${p.amountOff} cents)` : ''}
                    {' — '}
                    scope: {p.sessionId ? sessionTitleById.get(p.sessionId) || p.sessionId : 'global'}
                    {' — '}
                    redemptions: {p._count?.redemptions ?? 0}
                  </div>
                </div>
                <Button variant="outline" onClick={() => toggleActive(p)} disabled={loading}>
                  {p.isActive ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

