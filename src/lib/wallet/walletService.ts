import { Prisma } from '@prisma/client';
import { createLedgerEntry, type WalletTx } from '@/lib/wallet/ledgerService';

export const PLATFORM_WALLET_ID = 'platform';

function parseCommissionPercent(): number {
  const percentRaw = process.env.PLATFORM_COMMISSION_PERCENT;
  const parsed = percentRaw ? Number(percentRaw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 20;
}

export function computeSplit(amount: number): { platformCut: number; coachCut: number; platformPercent: number } {
  const platformPercent = parseCommissionPercent();
  const platformCut = Math.round((amount * platformPercent) / 100);
  const coachCut = amount - platformCut;
  return { platformCut, coachCut, platformPercent };
}

async function ensurePlatformWallet(tx: WalletTx, currency: string) {
  return await tx.platformWallet.upsert({
    where: { id: PLATFORM_WALLET_ID },
    create: {
      id: PLATFORM_WALLET_ID,
      currency,
      balance: 0,
      totalCommission: 0,
    },
    update: {},
  });
}

async function ensureCoachWallet(tx: WalletTx, coachId: string, currency: string) {
  const existing = await tx.coachWallet.findUnique({
    where: { coachId },
    select: { coachId: true, currency: true },
  });

  if (existing && existing.currency !== currency) {
    throw new Error('COACH_WALLET_CURRENCY_MISMATCH');
  }

  if (existing) return;

  await tx.coachWallet.create({
    data: {
      coachId,
      currency,
      availableAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    },
  });
}

/**
 * Records a PAID session payment settlement:
 * - PLATFORM: ledger CREDIT + wallet credit
 * - COACH: ledger CREDIT + wallet pending increment
 *
 * IMPORTANT: must be called only after the caller has created SessionPayment (idempotence gate).
 */
export async function recordSessionPaymentSettlement(params: {
  tx: WalletTx;
  coachId: string;
  currency: string;
  amount: number;
  platformCut: number;
  coachCut: number;
  referenceType: 'TRANSACTION';
  referenceId: string; // transactionId
}): Promise<void> {
  const { tx, coachId, currency, platformCut, coachCut, referenceType, referenceId } = params;

  await ensurePlatformWallet(tx, currency);
  await ensureCoachWallet(tx, coachId, currency);

  // RULE: no wallet mutation without ledger entry.
  // We insert ledger first (unique constraint provides idempotence); if it fails, the whole tx rolls back.

  await createLedgerEntry(tx, {
    ownerType: 'PLATFORM',
    ownerId: null,
    source: 'SESSION_PAYMENT',
    direction: 'CREDIT',
    amount: platformCut,
    currency,
    referenceType,
    referenceId,
  });

  await createLedgerEntry(tx, {
    ownerType: 'COACH',
    ownerId: coachId,
    source: 'SESSION_PAYMENT',
    direction: 'CREDIT',
    amount: coachCut,
    currency,
    referenceType,
    referenceId,
  });

  await tx.platformWallet.update({
    where: { id: PLATFORM_WALLET_ID },
    data: {
      balance: { increment: platformCut },
      totalCommission: { increment: platformCut },
    },
  });

  await tx.coachWallet.update({
    where: { coachId },
    data: {
      pendingAmount: { increment: coachCut },
    },
  });
}

/**
 * On session end: moves COACH pending -> available and writes ledger entries.
 *
 * Ledger is written as a DEBIT + CREDIT pair (same referenceId) to represent a bucket transfer.
 */
export async function releaseCoachPendingToAvailable(params: {
  tx: WalletTx;
  coachId: string;
  currency: string;
  amount: number;
  referenceType: 'SESSION';
  referenceId: string; // sessionId
}): Promise<void> {
  const { tx, coachId, currency, amount, referenceType, referenceId } = params;
  if (amount <= 0) return;

  await ensureCoachWallet(tx, coachId, currency);

  // Represent internal transfer as 2 ledger lines for auditability.
  // Insert ledger first; if a duplicate happens, tx rolls back => no partial ledger, no balance mutation.
  await createLedgerEntry(tx, {
    ownerType: 'COACH',
    ownerId: coachId,
    source: 'SESSION_PAYMENT',
    direction: 'DEBIT',
    amount,
    currency,
    referenceType,
    referenceId,
  });

  await createLedgerEntry(tx, {
    ownerType: 'COACH',
    ownerId: coachId,
    source: 'SESSION_PAYMENT',
    direction: 'CREDIT',
    amount,
    currency,
    referenceType,
    referenceId,
  });

  await tx.coachWallet.update({
    where: { coachId },
    data: {
      pendingAmount: { decrement: amount },
      availableAmount: { increment: amount },
    },
  });
}

