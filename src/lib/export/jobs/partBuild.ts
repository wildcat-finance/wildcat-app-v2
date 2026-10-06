import { ExportJobStatus, PrismaClient } from "@prisma/client"

import { prisma } from "@/lib/db"

import { ADMISSION_LOCK } from "./admission"

// Only the claim is transactional. RPC, rendering, and uploads never hold a
// database connection or lock while another Workflow waits for the same part.
export async function claimPartBuildWithClient(
  database: PrismaClient,
  key: string,
  jobId: string,
) {
  return database.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_LOCK})`
      const owner = await transaction.exportPartBuild.findUnique({
        where: { key },
        include: { job: { select: { status: true } } },
      })
      if (
        owner &&
        owner.jobId !== jobId &&
        (owner.job.status === ExportJobStatus.Queued ||
          owner.job.status === ExportJobStatus.Running)
      )
        return false
      await transaction.exportPartBuild.upsert({
        where: { key },
        create: { key, jobId },
        update: { jobId },
      })
      return true
    },
    { maxWait: 5_000, timeout: 5_000 },
  )
}

export const claimPartBuild = (key: string, jobId: string) =>
  claimPartBuildWithClient(prisma, key, jobId)
