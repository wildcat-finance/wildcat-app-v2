-- CreateTable
CREATE TABLE "RefusalToAssignMla" (
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timeSigned" TIMESTAMP(3) NOT NULL,
    "blockNumber" INTEGER,

    CONSTRAINT "RefusalToAssignMla_pkey" PRIMARY KEY ("chainId","market")
);
