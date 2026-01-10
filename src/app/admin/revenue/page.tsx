/**
 * Admin - Revenus & Commission
 * Minimal, functional tables (no design focus).
 */

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { CommissionEditor } from '@/components/admin/CommissionEditor';

export const dynamic = 'force-dynamic';

export default async function AdminRevenuePage() {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        Accès admin requis.
      </div>
    );
  }

  const commissionSetting = await prisma.uI_Settings
    .findUnique({ where: { key: 'platform_commission_percent' } })
    .catch(() => null);
  const commission = commissionSetting?.value ?? '20';

  const platformRevenue = await prisma.sessionPayment
    .aggregate({ where: { status: 'PAID' }, _sum: { platformCut: true } })
    .catch(() => ({ _sum: { platformCut: 0 } }));

  const balances = await prisma.coachBalance
    .findMany({
      include: { coach: { select: { name: true, email: true } } },
      orderBy: { totalEarned: 'desc' },
    })
    .catch(() => []);

  const subscriptions = await prisma.coachSubscription
    .findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenus & Commission</h1>
        <p className="text-gray-500">Commission plateforme + balances coach + abonnements.</p>
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <p className="text-sm text-gray-600">Commission actuelle (%)</p>
        <p className="text-2xl font-bold mb-3">{commission}%</p>
        <CommissionEditor initialValue={commission} />
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <p className="text-sm text-gray-600">Revenu plateforme (commission) total</p>
        <p className="text-2xl font-bold">{((platformRevenue._sum.platformCut || 0) / 100).toFixed(2)} CHF</p>
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <h2 className="font-semibold mb-2">Balances coach</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Coach</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2">Disponible</th>
                <th className="text-right py-2">En attente</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.coachId} className="border-b">
                  <td className="py-2">
                    <div className="font-medium">{b.coach.name}</div>
                    <div className="text-xs text-gray-500">{b.coach.email}</div>
                  </td>
                  <td className="py-2 text-right">{(b.totalEarned / 100).toFixed(2)} {b.currency}</td>
                  <td className="py-2 text-right">{(b.availableAmount / 100).toFixed(2)} {b.currency}</td>
                  <td className="py-2 text-right">{(b.pendingAmount / 100).toFixed(2)} {b.currency}</td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={4}>Aucune balance coach.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <h2 className="font-semibold mb-2">Abonnements coach</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Période</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2">
                    <div className="font-medium">{s.user.name}</div>
                    <div className="text-xs text-gray-500">{s.user.email}</div>
                  </td>
                  <td className="py-2">{s.status}</td>
                  <td className="py-2">{s.provider}</td>
                  <td className="py-2 text-xs text-gray-600">
                    {new Date(s.currentPeriodStart).toLocaleDateString('fr-FR')} → {new Date(s.currentPeriodEnd).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={4}>Aucun abonnement coach.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

