import { ExportJobStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getRun } from "workflow/api"

import { prisma } from "@/lib/db"
import {
  createExportDownloadUrl,
  exportObjectExists,
} from "@/lib/export/jobs/storage"
import { CanonicalExportRequest } from "@/lib/export/types"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = await prisma.exportJob.findUnique({
    where: { id: params.id },
    select: {
      status: true,
      progress: true,
      phase: true,
      params: true,
      error: true,
      artifactKey: true,
      generatedAtUtc: true,
    },
  })
  if (!job)
    return NextResponse.json({ error: "Export job not found" }, { status: 404 })

  const status = job.status.toLowerCase()
  let downloadUrl: string | undefined
  if (job.status === ExportJobStatus.Completed && job.artifactKey) {
    try {
      if (!(await exportObjectExists(job.artifactKey))) {
        throw new Error("Artifact missing")
      }
      downloadUrl = await createExportDownloadUrl(job.artifactKey)
    } catch {
      await prisma.exportJob.updateMany({
        where: {
          id: params.id,
          status: ExportJobStatus.Completed,
          artifactKey: job.artifactKey,
        },
        data: {
          status: ExportJobStatus.Failed,
          phase: "failed",
          errorClass: "ArtifactMissing",
          error: "The completed export artifact is no longer available",
          completedAt: new Date(),
          heartbeatAt: new Date(),
        },
      })
      return NextResponse.json(
        {
          status: "failed",
          progress: job.progress,
          phase: "failed",
          error: "The completed export artifact is no longer available",
          request: job.params as unknown as CanonicalExportRequest,
          generatedAtUtc: job.generatedAtUtc?.toISOString(),
        },
        { status: 410 },
      )
    }
  }
  return NextResponse.json({
    status,
    progress: job.progress,
    phase: job.phase,
    request: job.params as unknown as CanonicalExportRequest,
    ...(job.error ? { error: job.error } : {}),
    ...(downloadUrl ? { downloadUrl } : {}),
    generatedAtUtc: job.generatedAtUtc?.toISOString(),
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = await prisma.exportJob.findUnique({
    where: { id: params.id },
    select: { status: true, workflowRunId: true },
  })
  if (!job)
    return NextResponse.json({ error: "Export job not found" }, { status: 404 })
  if (
    job.status !== ExportJobStatus.Queued &&
    job.status !== ExportJobStatus.Running
  ) {
    return NextResponse.json({ status: job.status.toLowerCase() })
  }
  if (job.workflowRunId) await getRun(job.workflowRunId).cancel()
  await prisma.exportJob.updateMany({
    where: {
      id: params.id,
      status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
    },
    data: {
      status: ExportJobStatus.Cancelled,
      phase: "cancelled",
      error: "Export cancelled",
      completedAt: new Date(),
      heartbeatAt: new Date(),
    },
  })
  return NextResponse.json({ status: "cancelled" })
}
