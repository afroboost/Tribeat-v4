/**
 * Admin - Gestion des Paiements
 */

import { getTransactions, getPaymentStats } from '@/actions/payments';
import { prisma } from '@/lib/prisma';
import { PaymentManager } from '@/components/admin/PaymentManager';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const [transactionsResult, statsResult, usersResult] = await Promise.all([
    getTransactions().catch(() => ({ success: false, data: [] })),
    getPaymentStats().catch(() => ({ success: false, data: { totalAmount: 0, pending: 0, completed: 0, failed: 0 } })),
    prisma.user
      .findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => {
        console.error('[ADMIN][PAYMENTS] Failed to load users', error);
        return { ok: false as const, data: [] as any[] };
      }),
  ]);

  const transactions = transactionsResult.success ? (transactionsResult.data as any[]) : [];
  const stats = statsResult.success ? (statsResult.data as any) : { totalAmount: 0, pending: 0, completed: 0, failed: 0 };
  const users = usersResult.data;
  const hasLoadError = !transactionsResult.success || !statsResult.success || !usersResult.ok;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
        <p className="text-gray-500">Transactions et intégrations API</p>
      </div>

      {hasLoadError && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Certaines données n&apos;ont pas pu être chargées. Rafraîchissez la page pour réessayer.
        </div>
      )}

      <PaymentManager 
        transactions={transactions} 
        stats={stats}
        users={users} 
      />
    </div>
  );
}
