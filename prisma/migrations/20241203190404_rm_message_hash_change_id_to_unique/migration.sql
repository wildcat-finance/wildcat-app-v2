-- CreateTable
CREATE TABLE "LenderServiceAgreementSignature" (
    "chainId" INTEGER NOT NULL,
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timeSigned" TIMESTAMP(3) NOT NULL,
    "serviceAgreementHash" TEXT NOT NULL,

    CONSTRAINT "LenderServiceAgreementSignature_pkey" PRIMARY KEY ("chainId","signer","serviceAgreementHash")
);

-- CreateTable
CREATE TABLE "BorrowerServiceAgreementSignature" (
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timeSigned" TIMESTAMP(3) NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "serviceAgreementHash" TEXT NOT NULL,

    CONSTRAINT "BorrowerServiceAgreementSignature_pkey" PRIMARY KEY ("chainId","address")
);

-- CreateTable
CREATE TABLE "BorrowerInvitation" (
    "id" SERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviter" TEXT NOT NULL,
    "timeInvited" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "email" TEXT,
    "registeredOnChain" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "BorrowerProfileUpdateRequest" (
    "id" SERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "email" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "BorrowerProfileUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerInvitation_chainId_address_key" ON "BorrowerInvitation"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_chainId_address_key" ON "Borrower"("chainId", "address");

-- CreateIndex
CREATE INDEX "BorrowerProfileUpdateRequest_chainId_address_idx" ON "BorrowerProfileUpdateRequest"("chainId", "address");

-- AddForeignKey
ALTER TABLE "BorrowerServiceAgreementSignature" ADD CONSTRAINT "BorrowerServiceAgreementSignature_chainId_address_fkey" FOREIGN KEY ("chainId", "address") REFERENCES "Borrower"("chainId", "address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerInvitation" ADD CONSTRAINT "BorrowerInvitation_chainId_address_fkey" FOREIGN KEY ("chainId", "address") REFERENCES "Borrower"("chainId", "address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerProfileUpdateRequest" ADD CONSTRAINT "BorrowerProfileUpdateRequest_chainId_address_fkey" FOREIGN KEY ("chainId", "address") REFERENCES "Borrower"("chainId", "address") ON DELETE CASCADE ON UPDATE CASCADE;
