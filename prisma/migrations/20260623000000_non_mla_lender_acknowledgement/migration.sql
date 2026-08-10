-- Persist lender acknowledgement signatures for markets where the borrower
-- explicitly declined to assign a Master Loan Agreement.

CREATE TABLE "NonMlaAcknowledgement" (
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "kind" "SignatureKind" NOT NULL,
    "blockNumber" INTEGER,
    "acknowledgementTextVersion" TEXT NOT NULL,
    "acknowledgementText" TEXT NOT NULL,
    "timeSigned" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonMlaAcknowledgement_pkey" PRIMARY KEY ("chainId", "market", "address", "acknowledgementTextVersion")
);

CREATE INDEX "NonMlaAcknowledgement_chainId_address_idx" ON "NonMlaAcknowledgement"("chainId", "address");

ALTER TABLE "NonMlaAcknowledgement" ADD CONSTRAINT "NonMlaAcknowledgement_chainId_market_fkey" FOREIGN KEY ("chainId", "market") REFERENCES "RefusalToAssignMla"("chainId", "market") ON DELETE CASCADE ON UPDATE CASCADE;
