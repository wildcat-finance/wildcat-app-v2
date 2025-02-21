-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('EOA', 'GnosisSafe', 'OtherContract');

-- CreateEnum
CREATE TYPE "SignatureKind" AS ENUM ('ECDSA', 'GnosisSignature', 'GnosisOwnerECDSA', 'EIP1271');

-- CreateTable
CREATE TABLE "MlaSignature" (
    "kind" "SignatureKind" NOT NULL,
    "address" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,

    CONSTRAINT "MlaSignature_pkey" PRIMARY KEY ("chainId","market","signer")
);

-- CreateTable
CREATE TABLE "MlaTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN,
    "html" TEXT NOT NULL,
    "plaintext" TEXT NOT NULL,
    "borrowerFields" JSONB NOT NULL,
    "lenderFields" JSONB NOT NULL,

    CONSTRAINT "MlaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterLoanAgreement" (
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "borrower" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "plaintext" TEXT NOT NULL,
    "templateId" INTEGER NOT NULL,
    "lenderFields" JSONB NOT NULL,
    "mlaSignatureId" INTEGER,

    CONSTRAINT "MasterLoanAgreement_pkey" PRIMARY KEY ("chainId","market")
);

-- AddForeignKey
ALTER TABLE "MlaSignature" ADD CONSTRAINT "MlaSignature_chainId_market_fkey" FOREIGN KEY ("chainId", "market") REFERENCES "MasterLoanAgreement"("chainId", "market") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterLoanAgreement" ADD CONSTRAINT "MasterLoanAgreement_chainId_borrower_fkey" FOREIGN KEY ("chainId", "borrower") REFERENCES "Borrower"("chainId", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterLoanAgreement" ADD CONSTRAINT "MasterLoanAgreement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MlaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
