import { randomUUID } from "node:crypto"

import { ExportJobStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/db"

import { CanonicalExportRequest } from "../types"

const ADMISSION_LOCK = 8_510_852n
const GLOBAL_RUNNING_LIMIT = 8
const IP_RUNNING_LIMIT = 2
const IP_HOURLY_LIMIT = 10

export class ExportAdmissionError extends Error {}

export type AdmissionResult = {
  jobId: string
  created: boolean
  completed: boolean
  status: ExportJobStatus
  artifactKey?: string
  generatedAtUtc?: Date
}

export async function admitExportJob(
  request: CanonicalExportRequest,
  paramsHash: string,
  requestIp: string,
): Promise<AdmissionResult> {
  return prisma.$transaction(async (database) => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_LOCK})`

    const completed = await database.exportJob.findFirst({
      where: {
        paramsHash,
        status: ExportJobStatus.Completed,
        artifactKey: { not: null },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        status: true,
        artifactKey: true,
        generatedAtUtc: true,
      },
    })
    if (completed)
      return {
        jobId: completed.id,
        created: false,
        completed: true,
        status: completed.status,
        artifactKey: completed.artifactKey ?? undefined,
        generatedAtUtc: completed.generatedAtUtc ?? undefined,
      }

    const active = await database.exportJob.findFirst({
      where: {
        paramsHash,
        status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
      },
      select: { id: true, status: true },
    })
    if (active)
      return {
        jobId: active.id,
        created: false,
        completed: false,
        status: active.status,
      }

    const [globalRunning, ipRunning, recent] = await Promise.all([
      database.exportJob.count({
        where: {
          status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
        },
      }),
      database.exportJob.count({
        where: {
          requestIp,
          status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
        },
      }),
      database.exportJob.count({
        where: {
          requestIp,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      }),
    ])
    if (globalRunning >= GLOBAL_RUNNING_LIMIT) {
      throw new ExportAdmissionError(
        "Export capacity is currently full; try again shortly",
      )
    }
    if (ipRunning >= IP_RUNNING_LIMIT) {
      throw new ExportAdmissionError(
        "This client already has two exports in progress",
      )
    }
    if (recent >= IP_HOURLY_LIMIT) {
      throw new ExportAdmissionError(
        "This client has reached the hourly export limit",
      )
    }

    const job = await database.exportJob.create({
      data: {
        id: randomUUID(),
        chainId: request.chainId,
        paramsHash,
        params: request as unknown as Prisma.InputJsonValue,
        snapshotBlock: BigInt(request.snapshotBlock),
        snapshotBlockHash: request.snapshotBlockHash,
        requestIp,
      },
      select: { id: true },
    })
    return {
      jobId: job.id,
      created: true,
      completed: false,
      status: ExportJobStatus.Queued,
    }
  })
}
