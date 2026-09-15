/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any, arrow-body-style, import/first */

import { ExportJobStatus, Prisma, PrismaClient } from "@prisma/client"

type Row = {
  id: string
  paramsHash: string
  status: ExportJobStatus
  artifactKey: string | null
  generatedAtUtc: Date | null
  requestIp: string
  createdAt: Date
  workflowRunId?: string
  phase?: string
}

let rows: Row[] = []
let subscriptions: {
  jobId: string
  clientId: string
  cancelledAt: Date | null
}[] = []
let transactionQueue = Promise.resolve()
let transactionErrors: unknown[] = []

const matchesStatus = (row: Row, statuses?: ExportJobStatus[]) =>
  !statuses || statuses.includes(row.status)

const mockDatabase = {
  $executeRaw: jest.fn(async () => 1),
  $queryRaw: jest.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const paramsHash = values[0] as string
      const requestIp = values[1] as string
      const cutoff = values[3] as Date
      const active = rows.find(
        (row) =>
          row.paramsHash === paramsHash &&
          matchesStatus(row, [ExportJobStatus.Queued, ExportJobStatus.Running]),
      )
      return [
        {
          activeId: active?.id ?? null,
          activeStatus: active?.status.toLowerCase() ?? null,
          globalRunning: BigInt(
            rows.filter((row) =>
              matchesStatus(row, [
                ExportJobStatus.Queued,
                ExportJobStatus.Running,
              ]),
            ).length,
          ),
          ipRunning: BigInt(
            rows.filter(
              (row) =>
                row.requestIp === requestIp &&
                matchesStatus(row, [
                  ExportJobStatus.Queued,
                  ExportJobStatus.Running,
                ]),
            ).length,
          ),
          recent: BigInt(
            rows.filter(
              (row) => row.requestIp === requestIp && row.createdAt >= cutoff,
            ).length,
          ),
        },
      ]
    },
  ),
  exportJobSubscription: {
    upsert: jest.fn(async ({ create, update }: any) => {
      const existing = subscriptions.find(
        (s) => s.jobId === create.jobId && s.clientId === create.clientId,
      )
      if (existing) Object.assign(existing, update)
      else subscriptions.push({ ...create, cancelledAt: null })
    }),
    findUnique: jest.fn(
      async ({ where: { jobId_clientId: id } }: any) =>
        subscriptions.find(
          (s) => s.jobId === id.jobId && s.clientId === id.clientId,
        ) ?? null,
    ),
    update: jest.fn(async ({ where: { jobId_clientId: id }, data }: any) =>
      Object.assign(
        subscriptions.find(
          (s) => s.jobId === id.jobId && s.clientId === id.clientId,
        )!,
        data,
      ),
    ),
    count: jest.fn(
      async ({ where }: any) =>
        subscriptions.filter(
          (s) => s.jobId === where.jobId && s.cancelledAt === null,
        ).length,
    ),
  },
  exportJob: {
    findUnique: jest.fn(
      async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    ),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const row = rows.find(
        (r) => r.id === where.id && matchesStatus(r, where.status.in),
      )
      if (row) Object.assign(row, data)
      return { count: row ? 1 : 0 }
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      return (
        rows.find(
          (row) =>
            (!where.paramsHash || row.paramsHash === where.paramsHash) &&
            (!where.requestIp || row.requestIp === where.requestIp) &&
            (!where.status ||
              row.status === where.status ||
              matchesStatus(row, where.status.in)) &&
            (!where.artifactKey?.not || row.artifactKey !== null),
        ) ?? null
      )
    }),
    create: jest.fn(async ({ data }: any) => {
      const row: Row = {
        id: data.id,
        paramsHash: data.paramsHash,
        status: ExportJobStatus.Queued,
        artifactKey: null,
        generatedAtUtc: null,
        requestIp: data.requestIp,
        createdAt: new Date(),
      }
      rows.push(row)
      subscriptions.push({
        jobId: row.id,
        clientId: data.subscriptions.create.clientId,
        cancelledAt: null,
      })
      return { id: row.id }
    }),
  },
}

const mockTransaction = jest.fn(
  (callback: (database: typeof mockDatabase) => unknown, options?: unknown) => {
    expect(options).toEqual({ maxWait: 5_000, timeout: 5_000 })
    const transaction = transactionQueue.then(() => {
      const error = transactionErrors.shift()
      if (error) throw error
      return callback(mockDatabase)
    })
    transactionQueue = transaction.then(
      () => undefined,
      () => undefined,
    )
    return transaction
  },
)

jest.mock("@/lib/db", () => ({
  prisma: {
    exportJob: {
      findFirst: (...args: unknown[]) =>
        mockDatabase.exportJob.findFirst(...(args as [any])),
    },
    exportJobSubscription: {
      upsert: (...args: unknown[]) =>
        mockDatabase.exportJobSubscription.upsert(...(args as [any])),
    },
    $transaction: (...args: unknown[]) =>
      mockTransaction(
        ...(args as [(database: typeof mockDatabase) => unknown, unknown]),
      ),
  },
}))

import {
  admitExportJob as submitExportJob,
  cancelExportSubscriptionWithClient,
  ExportAdmissionError,
} from "./admission"
import { CanonicalExportRequest } from "../types"

const admitExportJob = (
  request: CanonicalExportRequest,
  hash: string,
  ip: string,
) => submitExportJob(request, hash, ip, ip)
const cancelSubscription = (jobId: string, clientId: string) =>
  cancelExportSubscriptionWithClient(
    {
      ...mockDatabase,
      $transaction: mockTransaction,
    } as unknown as PrismaClient,
    jobId,
    clientId,
  )

const request: CanonicalExportRequest = {
  chainId: 1,
  markets: ["0x1111111111111111111111111111111111111111"],
  statements: [],
  addresses: [],
  format: "pdf",
  snapshotBlock: "123",
  snapshotBlockHash: `0x${"1".repeat(64)}`,
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("database error", {
    code,
    clientVersion: "test",
  })

describe("export admission", () => {
  beforeEach(() => {
    rows = []
    subscriptions = []
    transactionQueue = Promise.resolve()
    transactionErrors = []
    jest.clearAllMocks()
  })

  it("coalesces simultaneous identical requests across IP addresses", async () => {
    const results = await Promise.all([
      admitExportJob(request, "same", "1.1.1.1"),
      admitExportJob(request, "same", "2.2.2.2"),
    ])
    expect(results.filter((result) => result.created)).toHaveLength(1)
    expect(new Set(results.map((result) => result.jobId)).size).toBe(1)
    expect(rows).toHaveLength(1)
    expect(subscriptions).toHaveLength(2)
  })

  it("serializes the cross-IP global running cap", async () => {
    rows = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      paramsHash: `existing-${index}`,
      status: ExportJobStatus.Running,
      artifactKey: null,
      generatedAtUtc: null,
      requestIp: `10.0.0.${index}`,
      createdAt: new Date(),
    }))
    const results = await Promise.allSettled([
      admitExportJob(request, "new-a", "20.0.0.1"),
      admitExportJob(request, "new-b", "20.0.0.2"),
    ])
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect(rejected).toMatchObject({
      reason: expect.any(ExportAdmissionError),
    })
  })

  it("returns a completed artifact without opening a transaction", async () => {
    rows.push({
      id: "complete",
      paramsHash: "same",
      status: ExportJobStatus.Completed,
      artifactKey: "bundle.zip",
      generatedAtUtc: new Date("2026-01-01T00:00:00Z"),
      requestIp: "old",
      createdAt: new Date(),
    })
    await expect(admitExportJob(request, "same", "new")).resolves.toMatchObject(
      {
        jobId: "complete",
        completed: true,
        created: false,
        artifactKey: "bundle.zip",
      },
    )
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("uses explicit limits for the short admission transaction", async () => {
    await admitExportJob(request, "new", "1.1.1.1")
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockTransaction).toHaveBeenLastCalledWith(expect.any(Function), {
      maxWait: 5_000,
      timeout: 5_000,
    })
  })

  it("retries a closed transaction before reporting unavailability", async () => {
    transactionErrors = [prismaError("P2028")]
    await expect(
      admitExportJob(request, "new", "1.1.1.1"),
    ).resolves.toMatchObject({ created: true })
    expect(mockTransaction).toHaveBeenCalledTimes(2)
  })

  it("returns a stable service error when transaction failures persist", async () => {
    transactionErrors = [
      prismaError("P2028"),
      prismaError("P2028"),
      prismaError("P2028"),
    ]
    await expect(
      admitExportJob(request, "new", "1.1.1.1"),
    ).rejects.toMatchObject({
      unavailable: true,
      message: "The export service is temporarily busy; please try again",
    })
    expect(rows).toHaveLength(0)
  })
})

describe("shared export cancellation", () => {
  beforeEach(() => {
    rows = []
    subscriptions = []
    transactionQueue = Promise.resolve()
    transactionErrors = []
    jest.clearAllMocks()
  })

  it("detaches one caller and stops the run only after the last subscriber cancels", async () => {
    const first = await admitExportJob(request, "same", "first")
    await admitExportJob(request, "same", "second")
    rows[0].workflowRunId = "workflow"
    expect(await cancelSubscription(first.jobId, "first")).toEqual({
      status: "cancelled",
    })
    expect(rows[0].status).toBe(ExportJobStatus.Queued)
    expect(await cancelSubscription(first.jobId, "second")).toEqual({
      status: "cancelled",
      workflowRunId: "workflow",
    })
    expect(rows[0]).toMatchObject({
      status: ExportJobStatus.Cancelled,
      phase: "cancelling",
    })
  })

  it("rejects an unrelated caller and reattaches a previous subscriber on resubmission", async () => {
    const first = await admitExportJob(request, "same", "first")
    await admitExportJob(request, "same", "second")
    expect(await cancelSubscription(first.jobId, "stranger")).toEqual({
      status: "forbidden",
    })
    await cancelSubscription(first.jobId, "first")
    await admitExportJob(request, "same", "first")
    expect(
      subscriptions.find((s) => s.clientId === "first")?.cancelledAt,
    ).toBeNull()
    expect(await cancelSubscription(first.jobId, "second")).toEqual({
      status: "cancelled",
    })
    expect(rows[0].status).toBe(ExportJobStatus.Queued)
  })

  it("does not grant cancellation rights for pre-migration jobs without subscriptions", async () => {
    const first = await admitExportJob(request, "same", "first")
    subscriptions = []
    expect(await cancelSubscription(first.jobId, "stranger")).toEqual({
      status: "forbidden",
    })
    expect(rows[0].status).toBe(ExportJobStatus.Queued)
  })
})
