/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any, arrow-body-style, import/first */

import { ExportJobStatus } from "@prisma/client"

type Row = {
  id: string
  paramsHash: string
  status: ExportJobStatus
  artifactKey: string | null
  generatedAtUtc: Date | null
  requestIp: string
  createdAt: Date
}

let rows: Row[] = []
let transactionQueue = Promise.resolve()

const matchesStatus = (row: Row, statuses?: ExportJobStatus[]) =>
  !statuses || statuses.includes(row.status)

const mockDatabase = {
  $executeRaw: jest.fn(async () => 1),
  exportJob: {
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
    count: jest.fn(
      async ({ where }: any) =>
        rows.filter(
          (row) =>
            (!where.requestIp || row.requestIp === where.requestIp) &&
            matchesStatus(row, where.status?.in) &&
            (!where.createdAt?.gte || row.createdAt >= where.createdAt.gte),
        ).length,
    ),
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
      return { id: row.id }
    }),
  },
}

jest.mock("@/lib/db", () => ({
  prisma: {
    $transaction: jest.fn(
      (callback: (database: typeof mockDatabase) => unknown) => {
        const transaction = transactionQueue.then(() => callback(mockDatabase))
        transactionQueue = transaction.then(
          () => undefined,
          () => undefined,
        )
        return transaction
      },
    ),
  },
}))

import { admitExportJob, ExportAdmissionError } from "./admission"
import { CanonicalExportRequest } from "../types"

const request: CanonicalExportRequest = {
  chainId: 1,
  markets: "all",
  statements: [],
  addresses: [],
  format: "pdf",
  snapshotBlock: "123",
  snapshotBlockHash: `0x${"1".repeat(64)}`,
}

describe("export admission", () => {
  beforeEach(() => {
    rows = []
    transactionQueue = Promise.resolve()
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

  it("returns a completed artifact without creating a new row", async () => {
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
  })
})
