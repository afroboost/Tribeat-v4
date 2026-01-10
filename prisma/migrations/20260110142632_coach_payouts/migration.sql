-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    CONSTRAINT "Payout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payout_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "userId" TEXT,
    "transactionId" TEXT,
    "payoutId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("amount", "createdAt", "currency", "id", "transactionId", "type", "userId") SELECT "amount", "createdAt", "currency", "id", "transactionId", "type", "userId" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");
CREATE INDEX "LedgerEntry_payoutId_idx" ON "LedgerEntry"("payoutId");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
CREATE UNIQUE INDEX "LedgerEntry_transactionId_type_key" ON "LedgerEntry"("transactionId", "type");
CREATE UNIQUE INDEX "LedgerEntry_payoutId_key" ON "LedgerEntry"("payoutId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Payout_coachId_idx" ON "Payout"("coachId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");
