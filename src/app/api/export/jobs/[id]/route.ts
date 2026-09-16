import { ExportJobStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { cancelExportSubscription } from "@/lib/export/jobs/admission"
import { finishExportCancellation } from "@/lib/export/jobs/cancellation"
import { getExportClientId } from "@/lib/export/jobs/client"
import { CanonicalExportRequest } from "@/lib/export/types"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
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
      snapshotTimestampUtc: true,
    },
  })
  if (!job)
    return NextResponse.json({ error: "Export job not found" }, { status: 404 })

  const clientId = getExportClientId(request)
  const subscription = clientId
    ? await prisma.exportJobSubscription.findUnique({
        where: { jobId_clientId: { jobId: params.id, clientId } },
      })
    : null
  const cancelled = subscription?.cancelledAt != null
  const status = cancelled ? "cancelled" : job.status.toLowerCase()
  const downloadUrl =
    !cancelled && job.status === ExportJobStatus.Completed && job.artifactKey
      ? `/api/export/jobs/${params.id}/download`
      : undefined
  return NextResponse.json({
    status,
    progress: job.progress,
    phase: cancelled ? "cancelled" : job.phase,
    request: job.params as unknown as CanonicalExportRequest,
    ...(job.error ? { error: job.error } : {}),
    ...(downloadUrl ? { downloadUrl } : {}),
    generatedAtUtc: job.generatedAtUtc?.toISOString(),
    snapshotTimestampUtc: job.snapshotTimestampUtc?.toISOString(),
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const clientId = getExportClientId(request)
  if (!clientId)
    return NextResponse.json(
      { error: "No export subscription" },
      { status: 403 },
    )
  const result = await cancelExportSubscription(params.id, clientId)
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Export job not found" }, { status: 404 })
  }
  if (result.status === "forbidden") {
    return NextResponse.json(
      { error: "No export subscription" },
      { status: 403 },
    )
  }
  if ("workflowRunId" in result && result.workflowRunId) {
    try {
      await finishExportCancellation(params.id, result.workflowRunId)
    } catch {
      // The reconciler retries the durable cancelling phase; this caller's
      // subscription has already been detached.
    }
  }
  return NextResponse.json({ status: result.status })
}
