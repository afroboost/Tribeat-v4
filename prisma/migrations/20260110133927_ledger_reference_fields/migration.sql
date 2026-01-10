/*
  NOTE:
  - This repo historically used `prisma db push` (no migration history), so earlier data migrations are not guaranteed.
  - For existing installations, you MUST backfill/translate:
      PlatformWallet.commissionTotal -> PlatformWallet.totalCommission
      WalletLedger.referenceType (set appropriately, e.g. 'TRANSACTION' for payment rows, 'SESSION' for releases)
*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformWallet" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'platform',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformWallet" ("balance", "createdAt", "currency", "id", "totalCommission", "updatedAt")
SELECT "balance", "createdAt", "currency", "id", COALESCE("commissionTotal", 0), "updatedAt"
FROM "PlatformWallet";
DROP TABLE "PlatformWallet";
ALTER TABLE "new_PlatformWallet" RENAME TO "PlatformWallet";
CREATE TABLE "new_WalletLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "source" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "referenceType" TEXT NOT NULL DEFAULT 'TRANSACTION',
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WalletLedger" ("amount", "createdAt", "currency", "direction", "id", "ownerId", "ownerType", "referenceId", "referenceType", "source")
SELECT "amount", "createdAt", "currency", "direction", "id", "ownerId", "ownerType", "referenceId", 'TRANSACTION', "source"
FROM "WalletLedger";
DROP TABLE "WalletLedger";
ALTER TABLE "new_WalletLedger" RENAME TO "WalletLedger";
CREATE INDEX "WalletLedger_ownerType_ownerId_idx" ON "WalletLedger"("ownerType", "ownerId");
CREATE INDEX "WalletLedger_source_idx" ON "WalletLedger"("source");
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");
CREATE INDEX "WalletLedger_createdAt_idx" ON "WalletLedger"("createdAt");
CREATE UNIQUE INDEX "WalletLedger_ownerType_ownerId_source_direction_referenceType_referenceId_key" ON "WalletLedger"("ownerType", "ownerId", "source", "direction", "referenceType", "referenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
