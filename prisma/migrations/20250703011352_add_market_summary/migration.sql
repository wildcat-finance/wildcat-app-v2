-- CreateTable
CREATE TABLE "MarketDescription" (
    "chainId" INTEGER NOT NULL,
    "marketAddress" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketDescription_chainId_marketAddress_key" ON "MarketDescription"("chainId", "marketAddress");
