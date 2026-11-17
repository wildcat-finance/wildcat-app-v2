-- CreateEnum
CREATE TYPE "LenderKycStartSource" AS ENUM ('click', 'walletSwitch');

-- CreateEnum
CREATE TYPE "LenderKycOutcome" AS ENUM ('submitted', 'updated', 'unchanged', 'skipped', 'closed', 'notSigned');

-- CreateEnum
CREATE TYPE "LenderKycNotSignedReason" AS ENUM ('declined', 'walletMismatch');

-- CreateEnum
CREATE TYPE "LenderKycMessageKind" AS ENUM ('details', 'ownership');

-- CreateEnum
CREATE TYPE "LenderKycSignatureKind" AS ENUM ('ECDSA', 'GnosisSignature', 'EIP1271');

-- CreateTable
CREATE TABLE "LenderKycStart" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "source" "LenderKycStartSource" NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "LenderKycOutcome",
    "outcomeReason" "LenderKycNotSignedReason",
    "outcomeAt" TIMESTAMP(3),
    "forwardedAt" TIMESTAMP(3),

    CONSTRAINT "LenderKycStart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LenderKycNonce" (
    "nonce" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "LenderKycNonce_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "LenderKycSignature" (
    "id" TEXT NOT NULL,
    "startId" TEXT NOT NULL,
    "messageKind" "LenderKycMessageKind" NOT NULL,
    "outcome" "LenderKycOutcome" NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "signatureKind" "LenderKycSignatureKind" NOT NULL,
    "blockNumber" INTEGER,
    "nonce" TEXT NOT NULL,
    "timeSigned" TIMESTAMP(3) NOT NULL,
    "signature" TEXT NOT NULL,
    "signedMessage" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LenderKycSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LenderKycProfileRevision" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "signatureId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "lenderType" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LenderKycProfileRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LenderKycStart_chainId_address_idx" ON "LenderKycStart"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "LenderKycSignature_nonce_key" ON "LenderKycSignature"("nonce");

-- CreateIndex
CREATE INDEX "LenderKycSignature_chainId_address_idx" ON "LenderKycSignature"("chainId", "address");

-- CreateIndex
CREATE INDEX "LenderKycSignature_startId_idx" ON "LenderKycSignature"("startId");

-- CreateIndex
CREATE INDEX "LenderKycProfileRevision_chainId_address_savedAt_idx" ON "LenderKycProfileRevision"("chainId", "address", "savedAt");

-- CreateIndex
CREATE INDEX "LenderKycProfileRevision_signatureId_idx" ON "LenderKycProfileRevision"("signatureId");

-- AddForeignKey
ALTER TABLE "LenderKycSignature" ADD CONSTRAINT "LenderKycSignature_startId_fkey" FOREIGN KEY ("startId") REFERENCES "LenderKycStart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderKycProfileRevision" ADD CONSTRAINT "LenderKycProfileRevision_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "LenderKycSignature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "LenderKycStart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LenderKycNonce" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LenderKycSignature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LenderKycProfileRevision" ENABLE ROW LEVEL SECURITY;
