-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "amountOff" INTEGER;
ALTER TABLE "PromoCode" ADD COLUMN "percentOff" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromoRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promoType" TEXT NOT NULL,
    "sessionId" TEXT,
    "transactionId" TEXT,
    "discountAmount" INTEGER,
    "finalAmount" INTEGER,
    "currency" TEXT,
    CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromoRedemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromoRedemption_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromoRedemption" ("id", "promoCodeId", "promoType", "redeemedAt", "sessionId", "userId") SELECT "id", "promoCodeId", "promoType", "redeemedAt", "sessionId", "userId" FROM "PromoRedemption";
DROP TABLE "PromoRedemption";
ALTER TABLE "new_PromoRedemption" RENAME TO "PromoRedemption";
CREATE INDEX "PromoRedemption_userId_idx" ON "PromoRedemption"("userId");
CREATE INDEX "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");
CREATE INDEX "PromoRedemption_redeemedAt_idx" ON "PromoRedemption"("redeemedAt");
CREATE INDEX "PromoRedemption_promoType_idx" ON "PromoRedemption"("promoType");
CREATE INDEX "PromoRedemption_sessionId_idx" ON "PromoRedemption"("sessionId");
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");
CREATE UNIQUE INDEX "PromoRedemption_transactionId_key" ON "PromoRedemption"("transactionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

