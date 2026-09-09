/* eslint-disable no-await-in-loop, no-continue, no-restricted-syntax */

import { ExportJobStatus } from "@prisma/client"
import { getRun } from "workflow/api"

import { prisma } from "@/lib/db"

const START_GRACE_MS = 2 * 60 * 1_000
export const EXPORT_RECONCILE_BATCH_SIZE = 100

export async function reconcileExportJobs(now = new Date()) {
  const jobs = await prisma.exportJob.findMany({
    where: {
      status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
    },
    orderBy: { createdAt: "asc" },
    take: EXPORT_RECONCILE_BATCH_SIZE,
    select: {
      id: true,
      status: true,
      workflowRunId: true,
      createdAt: true,
    },
  })
  let repaired = 0
  for (const job of jobs) {
    if (!job.workflowRunId) {
      if (now.getTime() - job.createdAt.getTime() < START_GRACE_MS) continue
      const result = await prisma.exportJob.updateMany({
        where: { id: job.id, status: job.status, workflowRunId: null },
        data: {
          status: ExportJobStatus.Failed,
          phase: "failed",
          errorClass: "WorkflowMissing",
          error: "The export workflow did not start",
          completedAt: now,
          heartbeatAt: now,
        },
      })
      repaired += result.count
      continue
    }

    try {
      const status = await getRun(job.workflowRunId).status
      if (status === "pending" || status === "running") continue
      const cancelled = status === "cancelled"
      const result = await prisma.exportJob.updateMany({
        where: {
          id: job.id,
          status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
        },
        data: {
          status: cancelled
            ? ExportJobStatus.Cancelled
            : ExportJobStatus.Failed,
          phase: cancelled ? "cancelled" : "failed",
          errorClass: cancelled ? "WorkflowCancelled" : "WorkflowTerminated",
          error: cancelled
            ? "Export cancelled"
            : `Workflow ended as ${status} before the export artifact was recorded`,
          completedAt: now,
          heartbeatAt: now,
        },
      })
      repaired += result.count
    } catch {
      // A temporary Workflow API failure must not turn a healthy export into a failure.
    }
  }
  return repaired
}
