import { getRun } from "workflow/api"

import { prisma } from "@/lib/db"

export async function finishExportCancellation(jobId: string, runId: string) {
  const run = getRun(runId)
  const active = (status: string) =>
    status === "pending" || status === "running"
  if (active(await run.status)) {
    try {
      await run.cancel()
    } catch (error) {
      // A step may finish or fail between the status read and cancellation.
      // Terminal runs need no further stopping; API failures on active runs do.
      if (active(await run.status)) throw error
    }
  }
  await prisma.exportJob.updateMany({
    where: { id: jobId, status: "Cancelled", phase: "cancelling" },
    data: { phase: "cancelled", heartbeatAt: new Date() },
  })
}
