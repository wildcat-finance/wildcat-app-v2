/** @jest-environment node */
/* eslint-disable import/first */

const mockAdmission = jest.fn()
const mockStart = jest.fn()
const mockUpdate = jest.fn()
const mockUpdateMany = jest.fn()
const mockFinishCancel = jest.fn()
const mockRpc = jest.fn()
const mockExists = jest.fn()
const mockTransaction = jest.fn()
jest.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    exportJob: {
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))
jest.mock("workflow/api", () => ({
  start: (...args: unknown[]) => mockStart(...args),
}))
jest.mock("@/lib/export/jobs/exportWorkflow", () => ({
  exportWorkflow: jest.fn(),
}))
jest.mock("@/lib/export/jobs/admission", () => ({
  admitExportJob: (...args: unknown[]) => mockAdmission(...args),
  ExportAdmissionError: class extends Error {},
}))
jest.mock("@/lib/export/jobs/cancellation", () => ({
  finishExportCancellation: (...args: unknown[]) => mockFinishCancel(...args),
}))
jest.mock("@/lib/export/jobs/storage", () => ({
  exportObjectExists: (...args: unknown[]) => mockExists(...args),
}))
jest.mock("@/lib/export/sources/rpc", () => ({
  ExportRpcClient: function Rpc(...args: unknown[]) {
    mockRpc(...args)
  },
}))
jest.mock("@/lib/export/sources/discovery", () => ({
  resolveSnapshotBlock: async () => ({
    blockNumber: 123,
    blockHash: `0x${"1".repeat(64)}`,
    timestamp: 1,
  }),
}))

import { NextRequest } from "next/server"

import { POST } from "./route"

const clientId = "00000000-0000-4000-8000-000000000001"
const request = (capability = clientId) =>
  new NextRequest("https://app.example/api/export/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-export-client": capability,
    },
    body: JSON.stringify({
      chainId: 1,
      markets: [`0x${"2".repeat(40)}`],
      statements: [],
    }),
  })

describe("export submission", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAdmission.mockResolvedValue({
      jobId: "job",
      created: true,
      completed: false,
      status: "Queued",
    })
    mockStart.mockResolvedValue({ runId: "run" })
    mockUpdate.mockResolvedValue({ status: "Queued" })
    mockFinishCancel.mockResolvedValue(undefined)
    mockExists.mockResolvedValue(true)
    mockTransaction.mockImplementation(async (action) =>
      action({
        exportJob: { update: mockUpdate, updateMany: mockUpdateMany },
      }),
    )
  })

  it("passes a short RPC lease, subscriber capability and snapshot time to admission", async () => {
    const response = await POST(request())
    expect(response.status).toBe(202)
    expect(mockRpc).toHaveBeenCalledWith(1, undefined, 1)
    expect(mockAdmission).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      "local",
      clientId,
      new Date(1000),
    )
    expect(await response.json()).toMatchObject({
      snapshotTimestampUtc: "1970-01-01T00:00:01.000Z",
    })
  })

  it("returns a stable download route for an existing completed export", async () => {
    mockAdmission.mockResolvedValue({
      jobId: "existing",
      completed: true,
      status: "Completed",
      artifactKey: "bundle",
    })
    expect(await (await POST(request())).json()).toMatchObject({
      downloadUrl: "/api/export/jobs/existing/download",
    })
    expect(mockStart).not.toHaveBeenCalled()
  })

  it("restores pending cancellation when a delayed start publishes after cancellation was reconciled", async () => {
    mockUpdate.mockResolvedValue({ status: "Cancelled", phase: "cancelled" })
    mockFinishCancel.mockRejectedValue(
      new Error("Workflow temporarily unavailable"),
    )
    expect((await POST(request())).status).toBe(202)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "job", status: "Cancelled" },
      data: { phase: "cancelling" },
    })
    expect(mockFinishCancel).toHaveBeenCalledWith("job", "run")
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 5_000,
      timeout: 5_000,
    })
    expect(mockFinishCancel.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockUpdateMany.mock.invocationCallOrder[0],
    )
  })

  it("rejects missing or malformed client capabilities before admission", async () => {
    expect((await POST(request("not-a-uuid"))).status).toBe(400)
    expect(mockAdmission).not.toHaveBeenCalled()
    expect(mockStart).not.toHaveBeenCalled()
  })
})
