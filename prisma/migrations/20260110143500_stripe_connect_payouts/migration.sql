-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Payout" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "stripePayoutId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "stripeTransferId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "stripeConnectAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

