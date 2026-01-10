-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "userId" TEXT,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WalletLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "source" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WalletLedger" ("amount", "createdAt", "currency", "direction", "id", "ownerId", "ownerType", "referenceId", "referenceType", "source") SELECT "amount", "createdAt", "currency", "direction", "id", "ownerId", "ownerType", "referenceId", "referenceType", "source" FROM "WalletLedger";
DROP TABLE "WalletLedger";
ALTER TABLE "new_WalletLedger" RENAME TO "WalletLedger";
CREATE INDEX "WalletLedger_ownerType_ownerId_idx" ON "WalletLedger"("ownerType", "ownerId");
CREATE INDEX "WalletLedger_source_idx" ON "WalletLedger"("source");
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");
CREATE INDEX "WalletLedger_createdAt_idx" ON "WalletLedger"("createdAt");
CREATE UNIQUE INDEX "WalletLedger_ownerType_ownerId_source_direction_referenceType_referenceId_key" ON "WalletLedger"("ownerType", "ownerId", "source", "direction", "referenceType", "referenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_transactionId_type_key" ON "LedgerEntry"("transactionId", "type");
