import { Prisma, WalletLedgerDirection, WalletLedgerSource, WalletOwnerType } from '@prisma/client';

export type WalletTx = Prisma.TransactionClient;

export interface LedgerEntryInput {
  ownerType: WalletOwnerType;
  ownerId: string;
  source: WalletLedgerSource;
  direction: WalletLedgerDirection;
  amount: number; // cents
  currency: string;
  referenceId: string;
}

/**
 * Creates a ledger entry (no swallowing).
 * Ledger is treated as immutable: we only ever INSERT.
 */
export async function createLedgerEntry(tx: WalletTx, entry: LedgerEntryInput) {
  return await tx.walletLedger.create({
    data: {
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      source: entry.source,
      direction: entry.direction,
      amount: entry.amount,
      currency: entry.currency,
      referenceId: entry.referenceId,
    },
  });
}

/**
 * Creates a ledger entry exactly once.
 * Returns true if created, false if it already existed (idempotence).
 */
export async function createLedgerEntryOnce(tx: WalletTx, entry: LedgerEntryInput): Promise<boolean> {
  try {
    await createLedgerEntry(tx, entry);
    return true;
  } catch (e) {
    // Idempotence: ignore duplicates for same (ownerType, ownerId, source, direction, referenceId)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return false;
    }
    throw e;
  }
}

