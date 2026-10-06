ALTER TABLE "ExportJob" ADD COLUMN "snapshotTimestampUtc" TIMESTAMP(3);

CREATE TABLE "ExportJobSubscription" (
    "jobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "ExportJobSubscription_pkey" PRIMARY KEY ("jobId", "clientId"),
    CONSTRAINT "ExportJobSubscription_jobId_fkey" FOREIGN KEY ("jobId")
      REFERENCES "ExportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ExportPartBuild" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    CONSTRAINT "ExportPartBuild_jobId_fkey" FOREIGN KEY ("jobId")
      REFERENCES "ExportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ExportPartBuild_jobId_idx" ON "ExportPartBuild"("jobId");
