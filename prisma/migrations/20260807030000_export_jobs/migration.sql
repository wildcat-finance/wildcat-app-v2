-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ExportArtifactKind" AS ENUM ('Part', 'Bundle');

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "paramsHash" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "snapshotBlock" BIGINT NOT NULL,
    "snapshotBlockHash" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
    "workflowRunId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'queued',
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorClass" TEXT,
    "error" TEXT,
    "artifactKey" TEXT,
    "generatedAtUtc" TIMESTAMP(3),
    "requestIp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExportJob_status_createdAt_idx" ON "ExportJob"("status", "createdAt");
CREATE INDEX "ExportJob_requestIp_status_idx" ON "ExportJob"("requestIp", "status");
CREATE INDEX "ExportJob_requestIp_createdAt_idx" ON "ExportJob"("requestIp", "createdAt");
CREATE INDEX "ExportJob_paramsHash_idx" ON "ExportJob"("paramsHash");

-- CreateTable
CREATE TABLE "ExportArtifact" (
    "key" TEXT NOT NULL,
    "kind" "ExportArtifactKind" NOT NULL,
    "jobId" TEXT,
    "checksum" TEXT NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportArtifact_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ExportProviderThrottle" (
    "key" TEXT NOT NULL,
    "nextRequestAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportProviderThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ExportArtifact_kind_lastAccessedAt_idx" ON "ExportArtifact"("kind", "lastAccessedAt");

-- CreateIndex
CREATE INDEX "ExportArtifact_jobId_idx" ON "ExportArtifact"("jobId");

-- Enforces one active job per canonical request, including callers that bypass admission.
CREATE UNIQUE INDEX "ExportJob_active_paramsHash_key"
ON "ExportJob"("paramsHash")
WHERE "status" IN ('queued', 'running');
