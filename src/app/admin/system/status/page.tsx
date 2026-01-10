/**
 * Admin UI: System Status
 * Route: /admin/system/status
 */

'use client';

import { useEffect, useState } from 'react';

type SystemStatus = {
  ok: boolean;
  env: string;
  db: { configured: boolean; ok: boolean };
  stripe: { configured: boolean; webhookSecretConfigured: boolean };
  pusher: { configured: boolean };
};

export default function AdminSystemStatusPage() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/system/status');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as SystemStatus;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">System Status</h1>
        <p className="text-sm text-gray-600">Diagnostics (no secrets)</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Erreur: {error}
        </div>
      )}

      {!data && !error && (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">Chargement…</div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-900">Environment</div>
            <div className="mt-1 text-sm text-gray-700">{data.env}</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-900">Database</div>
            <div className="mt-1 text-sm text-gray-700">
              configured: {String(data.db.configured)} · ok: {String(data.db.ok)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-900">Stripe</div>
            <div className="mt-1 text-sm text-gray-700">
              configured: {String(data.stripe.configured)} · webhookSecretConfigured:{' '}
              {String(data.stripe.webhookSecretConfigured)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-900">Pusher</div>
            <div className="mt-1 text-sm text-gray-700">
              configured: {String(data.pusher.configured)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

