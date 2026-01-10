import { prisma } from '@/lib/prisma';
import { computeSplit } from '@/lib/wallet/walletService';

/**
 * Shared settlement logic for non-Stripe providers.
 * IMPORTANT: Stripe flow remains untouched.
 *
 * This updates:
 * - Transaction status/providerTxId
 * - UserAccess
 * - SessionPayment
 * - LedgerEntry (platform + coach)
 *
 * Ledger entries are created ONLY here (webhook handlers).
 */
export async function settleTransactionFromWebhook(params: {
  transactionId: string;
  status: 'success' | 'failed';
  providerTxId?: string;
}) {
  const { transactionId, status, providerTxId } = params;

  return await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { userAccess: true, offer: true },
    });
    if (!t) return { ok: false as const, error: 'Transaction introuvable' };

    if (status === 'failed') {
      if (t.status !== 'FAILED') {
        await tx.transaction.update({
          where: { id: t.id },
          data: { status: 'FAILED', ...(providerTxId ? { providerTxId } : {}) },
        });
      }
      return { ok: true as const, status: 'FAILED' as const };
    }

    // success
    if (t.status !== 'COMPLETED') {
      await tx.transaction.update({
        where: { id: t.id },
        data: { status: 'COMPLETED', ...(providerTxId ? { providerTxId } : {}) },
      });
    }

    // Ensure UserAccess (same as Stripe webhook semantics)
    if (!t.userAccess) {
      await tx.userAccess.create({
        data: {
          userId: t.userId,
          offerId: t.offerId,
          sessionId: t.offer?.sessionId || null,
          transactionId: t.id,
          status: 'ACTIVE',
          grantedAt: new Date(),
        },
      });
    }

    // If offer is linked to a session, create SessionPayment + ledger entries
    const sessionId = t.offer?.sessionId;
    if (!sessionId) return { ok: true as const, status: 'COMPLETED' as const };

    const liveSession = await tx.session.findUnique({
      where: { id: sessionId },
      select: { id: true, coachId: true },
    });
    if (!liveSession) return { ok: false as const, error: 'Session introuvable' };

    const amount = t.amount;
    const currency = t.currency;
    const { platformCut, coachCut } = computeSplit(amount);

    // SessionPayment: idempotent by unique transactionId
    try {
      await tx.sessionPayment.create({
        data: {
          sessionId: liveSession.id,
          participantId: t.userId,
          transactionId: t.id,
          amount,
          platformCut,
          coachCut,
          currency,
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    } catch (e: any) {
      if (!(e?.code === 'P2002')) throw e;
    }

    // Ledger entries: idempotent by @@unique([transactionId,type])
    try {
      await tx.ledgerEntry.create({
        data: { type: 'PLATFORM_REVENUE', amount: platformCut, currency, userId: null, transactionId: t.id },
      });
    } catch (e: any) {
      if (!(e?.code === 'P2002')) throw e;
    }

    try {
      await tx.ledgerEntry.create({
        data: { type: 'COACH_EARNING', amount: coachCut, currency, userId: liveSession.coachId, transactionId: t.id },
      });
    } catch (e: any) {
      if (!(e?.code === 'P2002')) throw e;
    }

    return { ok: true as const, status: 'COMPLETED' as const };
  });
}

