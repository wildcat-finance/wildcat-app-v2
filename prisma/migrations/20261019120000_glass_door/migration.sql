-- CreateEnum
CREATE TYPE "GlassDoorPublicationKind" AS ENUM ('Intraday', 'DayClose');

-- CreateEnum
CREATE TYPE "GlassDoorPublicationStatus" AS ENUM ('Staged', 'Current', 'Superseded', 'Failed');

-- CreateEnum
CREATE TYPE "GlassDoorEntityKind" AS ENUM ('Market', 'Borrower');

-- CreateEnum
CREATE TYPE "GlassDoorMarketState" AS ENUM ('Preparing', 'Ok', 'UnderReview');

-- CreateEnum
CREATE TYPE "GlassDoorScanFilter" AS ENUM ('MarketLogs', 'TransfersOut', 'TransfersIn');

-- CreateTable
CREATE TABLE "GlassDoorPublication" (
    "id" TEXT NOT NULL,
    "kind" "GlassDoorPublicationKind" NOT NULL,
    "status" "GlassDoorPublicationStatus" NOT NULL DEFAULT 'Staged',
    "day" DATE,
    "cuts" JSONB NOT NULL,
    "registryVersion" TEXT NOT NULL,
    "checks" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "GlassDoorPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassDoorMetricSnapshot" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "entityKind" "GlassDoorEntityKind" NOT NULL,
    "chainId" INTEGER NOT NULL,
    "entityAddress" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "values" JSONB NOT NULL,
    "flags" JSONB,

    CONSTRAINT "GlassDoorMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassDoorMarketStatus" (
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "borrower" TEXT NOT NULL,
    "deploymentBlock" BIGINT NOT NULL,
    "checkedThroughBlock" BIGINT,
    "lastEventBlock" BIGINT,
    "lastRebuiltBlock" BIGINT,
    "datasetKey" TEXT,
    "tailState" JSONB,
    "closureCheck" JSONB,
    "state" "GlassDoorMarketState" NOT NULL DEFAULT 'Preparing',
    "stateReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlassDoorMarketStatus_pkey" PRIMARY KEY ("chainId","address")
);

-- CreateTable
CREATE TABLE "GlassDoorScanRange" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "filter" "GlassDoorScanFilter" NOT NULL,
    "fromBlock" BIGINT NOT NULL,
    "toBlock" BIGINT NOT NULL,
    "toBlockHash" TEXT NOT NULL,
    "addressSet" TEXT NOT NULL,
    "addresses" TEXT[],
    "logCount" INTEGER NOT NULL,
    "logs" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlassDoorScanRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassDoorChainDay" (
    "chainId" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTimestamp" INTEGER NOT NULL,

    CONSTRAINT "GlassDoorChainDay_pkey" PRIMARY KEY ("chainId","day")
);

-- CreateIndex
CREATE INDEX "GlassDoorPublication_status_createdAt_idx" ON "GlassDoorPublication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GlassDoorPublication_kind_day_idx" ON "GlassDoorPublication"("kind", "day");

-- CreateIndex
CREATE INDEX "GlassDoorMetricSnapshot_entityKind_chainId_entityAddress_da_idx" ON "GlassDoorMetricSnapshot"("entityKind", "chainId", "entityAddress", "day");

-- CreateIndex
CREATE UNIQUE INDEX "GlassDoorMetricSnapshot_publicationId_entityKind_chainId_en_key" ON "GlassDoorMetricSnapshot"("publicationId", "entityKind", "chainId", "entityAddress");

-- CreateIndex
CREATE INDEX "GlassDoorMarketStatus_chainId_borrower_idx" ON "GlassDoorMarketStatus"("chainId", "borrower");

-- CreateIndex
CREATE INDEX "GlassDoorScanRange_chainId_filter_toBlock_idx" ON "GlassDoorScanRange"("chainId", "filter", "toBlock");

-- CreateIndex
CREATE UNIQUE INDEX "GlassDoorScanRange_chainId_filter_addressSet_fromBlock_key" ON "GlassDoorScanRange"("chainId", "filter", "addressSet", "fromBlock");

-- AddForeignKey
ALTER TABLE "GlassDoorMetricSnapshot" ADD CONSTRAINT "GlassDoorMetricSnapshot_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "GlassDoorPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

