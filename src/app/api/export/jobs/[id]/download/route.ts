import { ExportJobStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import {
  createExportDownloadUrl,
  exportObjectExists,
} from "@/lib/export/jobs/storage"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = await prisma.exportJob.findUnique({
    where: { id: params.id },
    select: { status: true, artifactKey: true },
  })
  if (!job)
    return NextResponse.json({ error: "Export job not found" }, { status: 404 })
  if (job.status !== ExportJobStatus.Completed || !job.artifactKey) {
    return NextResponse.json(
      { error: "This export is not available to download" },
      { status: 409 },
    )
  }
  try {
    if (!(await exportObjectExists(job.artifactKey))) {
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
        { error: "The completed export artifact is no longer available" },
        { status: 410 },
      )
    }
    const downloadUrl = await createExportDownloadUrl(job.artifactKey)
    return NextResponse.redirect(downloadUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return NextResponse.json(
      {
        error:
          "The download service is temporarily unavailable; please try again",
      },
      {
        status: 503,
        headers: { "Retry-After": "5", "Cache-Control": "no-store" },
      },
    )
  }
}
