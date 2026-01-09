'use server';

/**
 * Server Actions - Gestion des Paiements
 * CRUD + préparation API Stripe/TWINT
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TransactionStatus, TransactionProvider } from '@prisma/client';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Récupérer toutes les transactions
 */
export async function getTransactions(): Promise<ActionResult> {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
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
 * Créer une transaction manuelle (lien de paiement)
 */
export async function createManualTransaction(
  userId: string,
  amount: number,
  currency: string = 'CHF',
  provider: TransactionProvider = 'MANUAL',
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        provider,
        status: 'PENDING',
        metadata: metadata || {},
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    revalidatePath('/admin/payments');
    return { success: true, data: transaction };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: 'Erreur lors de la création de la transaction' };
  }
}

/**
 * Mettre à jour le statut d'une transaction
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  providerTxId?: string
): Promise<ActionResult> {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { 
        status,
        ...(providerTxId && { providerTxId }),
      },
    });

    revalidatePath('/admin/payments');
    return { success: true, data: transaction };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

/**
 * Supprimer une transaction
 */
export async function deleteTransaction(transactionId: string): Promise<ActionResult> {
  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    revalidatePath('/admin/payments');
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Créer un lien de paiement Stripe (préparation)
 * Note: Nécessite STRIPE_SECRET_KEY configuré
 */
export async function createStripePaymentLink(
  userId: string,
  amount: number,
  description: string
): Promise<ActionResult> {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      // Mode dégradé : créer une transaction manuelle
      return createManualTransaction(userId, amount, 'CHF', 'STRIPE', {
        description,
        mode: 'manual_link',
      });
    }

    // TODO: Intégration Stripe réelle
    // const stripe = new Stripe(stripeKey);
    // const session = await stripe.checkout.sessions.create({...});
    
    // Pour l'instant, créer une transaction en attente
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: Math.round(amount * 100),
        currency: 'CHF',
        provider: 'STRIPE',
        status: 'PENDING',
        metadata: { description, mode: 'api_pending' },
      },
    });

    revalidatePath('/admin/payments');
    return { 
      success: true, 
      data: {
        transaction,
        message: 'Transaction créée. Configurez STRIPE_SECRET_KEY pour activer les paiements automatiques.',
      },
    };
  } catch (error) {
    console.error('Error creating Stripe payment:', error);
    return { success: false, error: 'Erreur lors de la création du paiement Stripe' };
  }
}

/**
 * Statistiques des paiements
 */
export async function getPaymentStats(): Promise<ActionResult> {
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
