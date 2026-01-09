/**
 * Admin - Gestion des Paiements
 * Transactions, liens de paiement, API Stripe/TWINT
 */

import { getTransactions, getPaymentStats } from '@/actions/payments';
import { prisma } from '@/lib/prisma';
import { PaymentManager } from '@/components/admin/PaymentManager';

export default async function PaymentsPage() {
  const [transactionsResult, statsResult, users] = await Promise.all([
    getTransactions(),
    getPaymentStats(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const transactions = transactionsResult.success ? (transactionsResult.data as any[]) : [];
  const stats = statsResult.success ? (statsResult.data as any) : { totalAmount: 0, pending: 0, completed: 0, failed: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Paiements
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Transactions, liens de paiement et intégrations API
        </p>
      </div>

      <PaymentManager 
        transactions={transactions} 
        stats={stats}
        users={users} 
      />
    </div>
  );
}
