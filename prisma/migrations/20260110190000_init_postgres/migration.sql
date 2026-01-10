-- NOTE: PostgreSQL init migration generated from current Prisma schema.
-- Apply with: npx prisma migrate deploy

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COACH', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('COACH', 'PARTICIPANT', 'MODERATOR');

-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('THEME', 'PWA', 'GENERAL');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('FR', 'EN', 'DE');

-- CreateEnum
CREATE TYPE "TransactionProvider" AS ENUM ('MANUAL', 'STRIPE', 'PAYSTACK', 'TWINT', 'MTN_MOMO', 'ORANGE_MONEY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PLATFORM_REVENUE', 'COACH_EARNING', 'PAYOUT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('PLATFORM', 'COACH');

-- CreateEnum
CREATE TYPE "WalletLedgerSource" AS ENUM ('SESSION_PAYMENT', 'SUBSCRIPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "WalletLedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletLedgerReferenceType" AS ENUM ('TRANSACTION', 'SESSION');

-- CreateEnum
CREATE TYPE "SessionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('FULL_FREE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "FreeAccessGrantSource" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARTICIPANT',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeConnectAccountId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coachId" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "MediaType",
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "maxParticipants" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLike" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UI_Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" "SettingCategory" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UI_Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "sessionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "provider" "TransactionProvider" NOT NULL,
    "providerTxId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "stripeConnectAccountId" TEXT,
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "userId" TEXT,
    "transactionId" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachWallet" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "availableAmount" INTEGER NOT NULL DEFAULT 0,
    "pendingAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformWallet" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "ownerType" "WalletOwnerType" NOT NULL,
    "ownerId" TEXT,
    "source" "WalletLedgerSource" NOT NULL,
    "direction" "WalletLedgerDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "referenceType" "WalletLedgerReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionPayment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "platformCut" INTEGER NOT NULL,
    "coachCut" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "status" "SessionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "releasedToCoachAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "offerId" TEXT,
    "transactionId" TEXT,
    "status" "AccessStatus" NOT NULL DEFAULT 'PENDING',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSessionState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "currentTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" INTEGER NOT NULL DEFAULT 80,
    "lastEventBy" TEXT,
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoCodeType" NOT NULL DEFAULT 'FULL_FREE',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "percentOff" INTEGER,
    "amountOff" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promoType" "PromoCodeType" NOT NULL,
    "sessionId" TEXT,
    "transactionId" TEXT,
    "discountAmount" INTEGER,
    "finalAmount" INTEGER,
    "currency" TEXT,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeAccessGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "source" "FreeAccessGrantSource" NOT NULL,
    "reason" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "revokedById" TEXT,

    CONSTRAINT "FreeAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_coachId_idx" ON "Session"("coachId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_scheduledAt_idx" ON "Session"("scheduledAt");

-- CreateIndex
CREATE INDEX "SessionLike_sessionId_createdAt_idx" ON "SessionLike"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionLike_sessionId_userId_createdAt_idx" ON "SessionLike"("sessionId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionLike_userId_createdAt_idx" ON "SessionLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_userId_sessionId_key" ON "SessionParticipant"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "SessionParticipant_sessionId_idx" ON "SessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "SessionParticipant_userId_idx" ON "SessionParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_timestamp_idx" ON "ChatMessage"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UI_Settings_key_key" ON "UI_Settings"("key");

-- CreateIndex
CREATE INDEX "UI_Settings_category_idx" ON "UI_Settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_key_language_key" ON "Translation"("key", "language");

-- CreateIndex
CREATE INDEX "Translation_key_idx" ON "Translation"("key");

-- CreateIndex
CREATE INDEX "Translation_language_idx" ON "Translation"("language");

-- CreateIndex
CREATE INDEX "Offer_isActive_idx" ON "Offer"("isActive");

-- CreateIndex
CREATE INDEX "Offer_sessionId_idx" ON "Offer"("sessionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_offerId_idx" ON "Transaction"("offerId");

-- CreateIndex
CREATE INDEX "Transaction_provider_idx" ON "Transaction"("provider");

-- CreateIndex
CREATE INDEX "Transaction_providerTxId_idx" ON "Transaction"("providerTxId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_ledgerEntryId_key" ON "Payout"("id");

-- CreateIndex
CREATE INDEX "Payout_coachId_idx" ON "Payout"("coachId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_approvedAt_idx" ON "Payout"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_payoutId_idx" ON "LedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_transactionId_type_key" ON "LedgerEntry"("transactionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_payoutId_key" ON "LedgerEntry"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachWallet_coachId_key" ON "CoachWallet"("coachId");

-- CreateIndex
CREATE INDEX "CoachWallet_coachId_idx" ON "CoachWallet"("coachId");

-- CreateIndex
CREATE INDEX "WalletLedger_ownerType_ownerId_idx" ON "WalletLedger"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "WalletLedger_source_idx" ON "WalletLedger"("source");

-- CreateIndex
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");

-- CreateIndex
CREATE INDEX "WalletLedger_createdAt_idx" ON "WalletLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedger_ownerType_ownerId_source_direction_referenceTy_key" ON "WalletLedger"("ownerType", "ownerId", "source", "direction", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPayment_transactionId_key" ON "SessionPayment"("transactionId");

-- CreateIndex
CREATE INDEX "SessionPayment_sessionId_idx" ON "SessionPayment"("sessionId");

-- CreateIndex
CREATE INDEX "SessionPayment_participantId_idx" ON "SessionPayment"("participantId");

-- CreateIndex
CREATE INDEX "SessionPayment_status_idx" ON "SessionPayment"("status");

-- CreateIndex
CREATE INDEX "SessionPayment_paidAt_idx" ON "SessionPayment"("paidAt");

-- CreateIndex
CREATE INDEX "SessionPayment_releasedToCoachAt_idx" ON "SessionPayment"("releasedToCoachAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_transactionId_key" ON "UserAccess"("transactionId");

-- CreateIndex
CREATE INDEX "UserAccess_userId_idx" ON "UserAccess"("userId");

-- CreateIndex
CREATE INDEX "UserAccess_sessionId_idx" ON "UserAccess"("sessionId");

-- CreateIndex
CREATE INDEX "UserAccess_status_idx" ON "UserAccess"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSessionState_sessionId_key" ON "LiveSessionState"("sessionId");

-- CreateIndex
CREATE INDEX "LiveSessionState_sessionId_idx" ON "LiveSessionState"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode"("isActive");

-- CreateIndex
CREATE INDEX "PromoCode_startsAt_idx" ON "PromoCode"("startsAt");

-- CreateIndex
CREATE INDEX "PromoCode_endsAt_idx" ON "PromoCode"("endsAt");

-- CreateIndex
CREATE INDEX "PromoCode_sessionId_idx" ON "PromoCode"("sessionId");

-- CreateIndex
CREATE INDEX "PromoCode_createdById_idx" ON "PromoCode"("createdById");

-- CreateIndex
CREATE INDEX "PromoRedemption_userId_idx" ON "PromoRedemption"("userId");

-- CreateIndex
CREATE INDEX "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");

-- CreateIndex
CREATE INDEX "PromoRedemption_redeemedAt_idx" ON "PromoRedemption"("redeemedAt");

-- CreateIndex
CREATE INDEX "PromoRedemption_promoType_idx" ON "PromoRedemption"("promoType");

-- CreateIndex
CREATE INDEX "PromoRedemption_sessionId_idx" ON "PromoRedemption"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_transactionId_key" ON "PromoRedemption"("transactionId");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_userId_idx" ON "FreeAccessGrant"("userId");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_sessionId_idx" ON "FreeAccessGrant"("sessionId");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_source_idx" ON "FreeAccessGrant"("source");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_grantedAt_idx" ON "FreeAccessGrant"("grantedAt");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_expiresAt_idx" ON "FreeAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_revokedAt_idx" ON "FreeAccessGrant"("revokedAt");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_grantedById_idx" ON "FreeAccessGrant"("grantedById");

-- CreateIndex
CREATE INDEX "FreeAccessGrant_revokedById_idx" ON "FreeAccessGrant"("revokedById");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLike" ADD CONSTRAINT "SessionLike_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLike" ADD CONSTRAINT "SessionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachWallet" ADD CONSTRAINT "CoachWallet_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionState" ADD CONSTRAINT "LiveSessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeAccessGrant" ADD CONSTRAINT "FreeAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeAccessGrant" ADD CONSTRAINT "FreeAccessGrant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeAccessGrant" ADD CONSTRAINT "FreeAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeAccessGrant" ADD CONSTRAINT "FreeAccessGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

