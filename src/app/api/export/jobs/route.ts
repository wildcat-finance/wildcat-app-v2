/* eslint-disable no-await-in-loop */

import { NextRequest, NextResponse } from "next/server"
import { start } from "workflow/api"
import { ZodError } from "zod"

import { prisma } from "@/lib/db"
import {
  admitExportJob,
  ExportAdmissionError,
} from "@/lib/export/jobs/admission"
import { exportWorkflow } from "@/lib/export/jobs/exportWorkflow"
import {
  createExportDownloadUrl,
  exportObjectExists,
} from "@/lib/export/jobs/storage"
import { resolveSnapshotBlock } from "@/lib/export/sources/discovery"
import { ExportRpcClient } from "@/lib/export/sources/rpc"
import {
  canonicalizeExportRequest,
  hashExportRequest,
  parseExportRequest,
} from "@/lib/export/validation"

export const runtime = "nodejs"
const MAX_REQUEST_BYTES = 64 * 1_024

const clientIp = (request: NextRequest) =>
  request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "local"

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0)
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Export request is too large" },
        { status: 413 },
      )
    }
    const body = await request.text()
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Export request is too large" },
        { status: 413 },
      )
    }
    const parsed = parseExportRequest(JSON.parse(body))
    const rpc = new ExportRpcClient(parsed.chainId)
    const snapshot = await resolveSnapshotBlock(rpc, parsed.snapshotBlock)
    const canonical = canonicalizeExportRequest(
      parsed,
      snapshot.blockNumber,
      snapshot.blockHash,
    )
    const paramsHash = hashExportRequest(canonical)
    let admission = await admitExportJob(
      canonical,
      paramsHash,
      clientIp(request),
    )
    while (
      admission.completed &&
      admission.artifactKey &&
      !(await exportObjectExists(admission.artifactKey))
    ) {
      await prisma.exportJob.updateMany({
        where: { id: admission.jobId, status: "Completed" },
        data: {
          status: "Failed",
          errorClass: "ArtifactMissing",
          error: "The cached export artifact is no longer available",
          completedAt: new Date(),
        },
      })
      admission = await admitExportJob(canonical, paramsHash, clientIp(request))
    }
    if (admission.created) {
      let run
      try {
        run = await start(exportWorkflow, [admission.jobId])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Workflow failed to start"
        await prisma.exportJob.update({
          where: { id: admission.jobId },
          data: {
            status: "Failed",
            errorClass: "WorkflowStartError",
            error: message.slice(0, 4_000),
            completedAt: new Date(),
          },
        })
        throw error
      }
      await prisma.exportJob.update({
        where: { id: admission.jobId },
        data: { workflowRunId: run.runId },
      })
    }
    const downloadUrl =
      admission.completed && admission.artifactKey
        ? await createExportDownloadUrl(admission.artifactKey)
        : undefined
    return NextResponse.json(
      {
        jobId: admission.jobId,
        status: admission.status.toLowerCase(),
        request: canonical,
        ...(downloadUrl ? { downloadUrl } : {}),
        generatedAtUtc: admission.generatedAtUtc?.toISOString(),
      },
      { status: admission.completed ? 200 : 202 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create export"
    let status = 500
    if (error instanceof ZodError) status = 400
    if (error instanceof SyntaxError) status = 400
    if (error instanceof ExportAdmissionError) {
      return NextResponse.json(
        { error: message },
        { status: 429, headers: { "Retry-After": "60" } },
      )
    }
    return NextResponse.json({ error: message }, { status })
  }
}
