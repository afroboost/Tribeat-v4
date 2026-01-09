/**
 * Admin - Gestion des Paiements
 */

import { getTransactions, getPaymentStats } from '@/actions/payments';
import { prisma } from '@/lib/prisma';
import { PaymentManager } from '@/components/admin/PaymentManager';

export default async function PaymentsPage() {
  const [transactionsResult, statsResult, users] = await Promise.all([
    getTransactions().catch(() => ({ success: false, data: [] })),
    getPaymentStats().catch(() => ({ success: false, data: { totalAmount: 0, pending: 0, completed: 0, failed: 0 } })),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }).catch(() => []),
  ]);

  const transactions = transactionsResult.success ? (transactionsResult.data as any[]) : [];
  const stats = statsResult.success ? (statsResult.data as any) : { totalAmount: 0, pending: 0, completed: 0, failed: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
        <p className="text-gray-500">Transactions et intégrations API</p>
      </div>

      <PaymentManager 
        transactions={transactions} 
        stats={stats}
        users={users} 
      />
    </div>
  );
}
