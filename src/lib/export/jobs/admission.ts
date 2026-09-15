import { randomUUID } from "node:crypto"

import { ExportJobStatus, Prisma, PrismaClient } from "@prisma/client"

import { prisma } from "@/lib/db"

import { CanonicalExportRequest } from "../types"

export const ADMISSION_LOCK = 8_510_852n
const GLOBAL_RUNNING_LIMIT = 8
const IP_RUNNING_LIMIT = 2
const IP_HOURLY_LIMIT = 10
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 5_000 } as const
const RETRY_DELAYS_MS = [25, 100] as const

export class ExportAdmissionError extends Error {
  constructor(
    message: string,
    readonly unavailable = false,
  ) {
    super(message)
  }
}

export type AdmissionResult = {
  jobId: string
  created: boolean
  completed: boolean
  status: ExportJobStatus
  artifactKey?: string
  generatedAtUtc?: Date
  snapshotTimestampUtc?: Date
}

type AdmissionSnapshot = {
  activeId: string | null
  activeStatus: "queued" | "running" | null
  globalRunning: bigint
  ipRunning: bigint
  recent: bigint
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isKnownRequestError = (error: unknown, codes: string[]) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  codes.includes(error.code)

const isTransientAdmissionError = (error: unknown) =>
  isKnownRequestError(error, ["P2024", "P2028", "P2034"])

const activeStatus = (status: "queued" | "running") =>
  status === "running" ? ExportJobStatus.Running : ExportJobStatus.Queued

async function findCompletedJob(
  database: PrismaClient,
  paramsHash: string,
): Promise<AdmissionResult | undefined> {
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
      snapshotTimestampUtc: true,
    },
  })
  if (!completed) return undefined
  return {
    jobId: completed.id,
    created: false,
    completed: true,
    status: completed.status,
    artifactKey: completed.artifactKey ?? undefined,
    generatedAtUtc: completed.generatedAtUtc ?? undefined,
    snapshotTimestampUtc: completed.snapshotTimestampUtc ?? undefined,
  }
}

async function admitOnce(
  database: PrismaClient,
  request: CanonicalExportRequest,
  paramsHash: string,
  requestIp: string,
  clientId: string,
  snapshotTimestampUtc?: Date,
): Promise<AdmissionResult> {
  const completed = await findCompletedJob(database, paramsHash)
  if (completed) {
    await database.exportJobSubscription.upsert({
      where: { jobId_clientId: { jobId: completed.jobId, clientId } },
      create: { jobId: completed.jobId, clientId },
      update: { cancelledAt: null },
    })
    return completed
  }

  return database.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(${ADMISSION_LOCK})
    `

    const cutoff = new Date(Date.now() - 60 * 60 * 1_000)
    const [snapshot] = await transaction.$queryRaw<AdmissionSnapshot[]>`
      WITH "active" AS (
        SELECT "id", "status"
        FROM "ExportJob"
        WHERE "paramsHash" = ${paramsHash}
          AND "status" IN ('queued', 'running')
        ORDER BY "createdAt" DESC
        LIMIT 1
      ),
      "counts" AS (
        SELECT
          COUNT(*) FILTER (
            WHERE "status" IN ('queued', 'running')
          ) AS "globalRunning",
          COUNT(*) FILTER (
            WHERE "requestIp" = ${requestIp}
              AND "status" IN ('queued', 'running')
          ) AS "ipRunning",
          COUNT(*) FILTER (
            WHERE "requestIp" = ${requestIp}
              AND "createdAt" >= ${cutoff}
          ) AS "recent"
        FROM "ExportJob"
      )
      SELECT
        "active"."id" AS "activeId",
        "active"."status"::text AS "activeStatus",
        "counts"."globalRunning",
        "counts"."ipRunning",
        "counts"."recent"
      FROM "counts"
      LEFT JOIN "active" ON TRUE
    `

    if (snapshot.activeId && snapshot.activeStatus) {
      await transaction.exportJobSubscription.upsert({
        where: { jobId_clientId: { jobId: snapshot.activeId, clientId } },
        create: { jobId: snapshot.activeId, clientId },
        update: { cancelledAt: null },
      })
      return {
        jobId: snapshot.activeId,
        created: false,
        completed: false,
        status: activeStatus(snapshot.activeStatus),
        snapshotTimestampUtc,
      }
    }
    if (snapshot.globalRunning >= BigInt(GLOBAL_RUNNING_LIMIT)) {
      throw new ExportAdmissionError(
        "Export capacity is currently full; try again shortly",
      )
    }
    if (snapshot.ipRunning >= BigInt(IP_RUNNING_LIMIT)) {
      throw new ExportAdmissionError(
        "This client already has two exports in progress",
      )
    }
    if (snapshot.recent >= BigInt(IP_HOURLY_LIMIT)) {
      throw new ExportAdmissionError(
        "This client has reached the hourly export limit",
      )
    }

    const job = await transaction.exportJob.create({
      data: {
        id: randomUUID(),
        chainId: request.chainId,
        paramsHash,
        params: request as unknown as Prisma.InputJsonValue,
        snapshotBlock: BigInt(request.snapshotBlock),
        snapshotBlockHash: request.snapshotBlockHash,
        requestIp,
        snapshotTimestampUtc,
        subscriptions: { create: { clientId } },
      },
      select: { id: true },
    })
    return {
      jobId: job.id,
      created: true,
      completed: false,
      status: ExportJobStatus.Queued,
      snapshotTimestampUtc,
    }
  }, TRANSACTION_OPTIONS)
}

async function attemptAdmission(
  database: PrismaClient,
  request: CanonicalExportRequest,
  paramsHash: string,
  requestIp: string,
  clientId: string,
  snapshotTimestampUtc: Date | undefined,
  attempt: number,
): Promise<AdmissionResult> {
  try {
    return await admitOnce(
      database,
      request,
      paramsHash,
      requestIp,
      clientId,
      snapshotTimestampUtc,
    )
  } catch (error) {
    if (
      !isKnownRequestError(error, ["P2002"]) &&
      !isTransientAdmissionError(error)
    ) {
      throw error
    }
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay === undefined) {
      throw new ExportAdmissionError(
        "The export service is temporarily busy; please try again",
        true,
      )
    }
    await sleep(delay)
    return attemptAdmission(
      database,
      request,
      paramsHash,
      requestIp,
      clientId,
      snapshotTimestampUtc,
      attempt + 1,
    )
  }
}

export async function admitExportJobWithClient(
  database: PrismaClient,
  request: CanonicalExportRequest,
  paramsHash: string,
  requestIp: string,
  clientId: string,
  snapshotTimestampUtc?: Date,
): Promise<AdmissionResult> {
  return attemptAdmission(
    database,
    request,
    paramsHash,
    requestIp,
    clientId,
    snapshotTimestampUtc,
    0,
  )
}

export const admitExportJob = (
  request: CanonicalExportRequest,
  paramsHash: string,
  requestIp: string,
  clientId: string,
  snapshotTimestampUtc?: Date,
) =>
  admitExportJobWithClient(
    prisma,
    request,
    paramsHash,
    requestIp,
    clientId,
    snapshotTimestampUtc,
  )

export async function cancelExportSubscriptionWithClient(
  database: PrismaClient,
  jobId: string,
  clientId: string,
) {
  return database.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_LOCK})`
    const job = await transaction.exportJob.findUnique({
      where: { id: jobId },
    })
    if (!job) return { status: "not_found" } as const
    const subscription = await transaction.exportJobSubscription.findUnique({
      where: { jobId_clientId: { jobId, clientId } },
    })
    if (!subscription) return { status: "forbidden" } as const
    if (job.status === ExportJobStatus.Cancelled) {
      return { status: "cancelled", workflowRunId: job.workflowRunId } as const
    }
    if (
      job.status !== ExportJobStatus.Queued &&
      job.status !== ExportJobStatus.Running
    ) {
      return { status: job.status.toLowerCase() }
    }
    await transaction.exportJobSubscription.update({
      where: { jobId_clientId: { jobId, clientId } },
      data: { cancelledAt: new Date() },
    })
    const subscribers = await transaction.exportJobSubscription.count({
      where: { jobId, cancelledAt: null },
    })
    if (subscribers > 0) return { status: "cancelled" } as const
    await transaction.exportJob.updateMany({
      where: {
        id: jobId,
        status: { in: [ExportJobStatus.Queued, ExportJobStatus.Running] },
      },
      data: {
        status: ExportJobStatus.Cancelled,
        phase: "cancelling",
        error: "Export cancelled",
        completedAt: new Date(),
        heartbeatAt: new Date(),
      },
    })
    return { status: "cancelled", workflowRunId: job.workflowRunId } as const
  }, TRANSACTION_OPTIONS)
}

export const cancelExportSubscription = (jobId: string, clientId: string) =>
  cancelExportSubscriptionWithClient(prisma, jobId, clientId)
