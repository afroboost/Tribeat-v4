'use server';

/**
 * Server Actions - Gestion des Paiements
 * SÉCURISÉ: Vérification admin dans chaque action critique
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TransactionStatus, TransactionProvider } from '@prisma/client';
import { requireAdmin, requireAuth, logAdminAction } from '@/lib/auth-helpers';
import { getPlatformCommissionPercent, splitRevenue } from '@/lib/monetization';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Récupérer toutes les transactions (ADMIN ONLY)
 */
export async function getTransactions(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        offer: { select: { id: true, name: true } },
        userAccess: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: transactions };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: 'Erreur lors de la récupération des transactions' };
  }
}

/**
 * Créer une transaction manuelle (ADMIN ONLY)
 */
export async function createManualTransaction(
  userId: string,
  amount: number,
  currency: string = 'CHF',
  offerId?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        offerId: offerId || null,
        amount: Math.round(amount * 100),
        currency,
        provider: 'MANUAL',
        status: 'PENDING',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logAdminAction('CREATE_MANUAL_TRANSACTION', auth.userId!, {
      transactionId: transaction.id,
      userId,
      amount,
    });

    revalidatePath('/admin/payments');
    return { success: true, data: transaction };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: 'Erreur lors de la création de la transaction' };
  }
}

/**
 * Valider une transaction manuelle et créer l'accès (ADMIN ONLY)
 */
export async function validateManualTransaction(
  transactionId: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { offer: true, userAccess: true },
    });

    if (!transaction) {
      return { success: false, error: 'Transaction non trouvée' };
    }

    if (transaction.status !== 'PENDING') {
      return { success: false, error: 'Transaction déjà traitée' };
    }

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED' },
    });

    // Créer l'accès si pas existant
    if (!transaction.userAccess) {
      await prisma.userAccess.create({
        data: {
          userId: transaction.userId,
          offerId: transaction.offerId,
          sessionId: transaction.offer?.sessionId || null,
          transactionId: transactionId,
          status: 'ACTIVE',
          grantedAt: new Date(),
        },
      });
    }

    // Revenue split + balances if offer is tied to a session
    if (transaction.offer?.sessionId) {
      const liveSession = await prisma.session.findUnique({
        where: { id: transaction.offer.sessionId },
        select: { coachId: true },
      });
      if (liveSession?.coachId) {
        const pct = await getPlatformCommissionPercent();
        const { platformCut, coachCut, commissionPercent } = splitRevenue(transaction.amount, pct);

        await prisma.$transaction(async (db) => {
          await db.sessionPayment.upsert({
            where: { transactionId: transactionId },
            update: { status: 'PAID', platformCut, coachCut, commissionPercent },
            create: {
              sessionId: transaction.offer!.sessionId!,
              participantId: transaction.userId,
              amount: transaction.amount,
              currency: transaction.currency,
              provider: transaction.provider,
              status: 'PAID',
              platformCut,
              coachCut,
              commissionPercent,
              transactionId: transactionId,
            },
          });

          await db.coachBalance.upsert({
            where: { coachId: liveSession.coachId },
            update: {
              availableAmount: { increment: coachCut },
              totalEarned: { increment: coachCut },
            },
            create: {
              coachId: liveSession.coachId,
              availableAmount: coachCut,
              pendingAmount: 0,
              totalEarned: coachCut,
              currency: transaction.currency,
            },
          });
        });
      }
    }

    logAdminAction('VALIDATE_MANUAL_TRANSACTION', auth.userId!, {
      transactionId,
      userId: transaction.userId,
    });

    revalidatePath('/admin/payments');
    revalidatePath('/admin/access');
    return { success: true };
  } catch (error) {
    console.error('Error validating transaction:', error);
    return { success: false, error: 'Erreur lors de la validation' };
  }
}

/**
 * Mettre à jour le statut d'une transaction (ADMIN ONLY)
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  providerTxId?: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { 
        status,
        ...(providerTxId && { providerTxId }),
      },
    });

    logAdminAction('UPDATE_TRANSACTION_STATUS', auth.userId!, {
      transactionId,
      newStatus: status,
    });

    revalidatePath('/admin/payments');
    return { success: true, data: transaction };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

/**
 * Supprimer une transaction (ADMIN ONLY)
 */
export async function deleteTransaction(transactionId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    logAdminAction('DELETE_TRANSACTION', auth.userId!, { transactionId });

    revalidatePath('/admin/payments');
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Statistiques des paiements (ADMIN ONLY)
 */
export async function getPaymentStats(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const [total, pending, completed, failed] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.transaction.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      success: true,
      data: {
        totalAmount: (total._sum.amount || 0) / 100,
        pending,
        completed,
        failed,
      },
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: 'Erreur' };
  }
}
