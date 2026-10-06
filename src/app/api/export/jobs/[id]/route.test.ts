/** @jest-environment node */
/* eslint-disable import/first */

const mockFindUnique = jest.fn()
const mockSubscription = jest.fn()
const mockUpdateMany = jest.fn()
const mockExists = jest.fn()
const mockSign = jest.fn()
const mockCancel = jest.fn()
const mockFinishCancel = jest.fn()

jest.mock("@/lib/db", () => ({
  prisma: {
    exportJob: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    exportJobSubscription: {
      findUnique: (...args: unknown[]) => mockSubscription(...args),
    },
  },
}))
jest.mock("@/lib/export/jobs/storage", () => ({
  exportObjectExists: (...args: unknown[]) => mockExists(...args),
  createExportDownloadUrl: (...args: unknown[]) => mockSign(...args),
}))
jest.mock("@/lib/export/jobs/admission", () => ({
  cancelExportSubscription: (...args: unknown[]) => mockCancel(...args),
}))
jest.mock("@/lib/export/jobs/cancellation", () => ({
  finishExportCancellation: (...args: unknown[]) => mockFinishCancel(...args),
}))

import { NextRequest } from "next/server"

import { GET as download } from "./download/route"
import { GET, DELETE } from "./route"

const client = "00000000-0000-4000-8000-000000000001"
const request = () =>
  new NextRequest("https://app.example/api/export/jobs/job", {
    headers: { "x-export-client": client },
  })
const params = { params: { id: "job" } }

describe("export job status and downloads", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindUnique.mockResolvedValue({
      status: "Completed",
      artifactKey: "bundle.zip",
      progress: 100,
      phase: "completed",
      params: {},
      snapshotTimestampUtc: new Date("2026-01-01T00:00:00Z"),
    })
    mockSubscription.mockResolvedValue(null)
    mockExists.mockResolvedValue(true)
    mockSign.mockResolvedValue("https://storage.example/bundle.zip?fresh-token")
    mockUpdateMany.mockResolvedValue({ count: 1 })
  })

  it("returns a stable download endpoint without contacting storage during polling", async () => {
    mockExists.mockRejectedValue(new Error("storage unavailable"))
    const response = await GET(request(), params)
    expect(await response.json()).toMatchObject({
      status: "completed",
      downloadUrl: "/api/export/jobs/job/download",
      snapshotTimestampUtc: "2026-01-01T00:00:00.000Z",
    })
    expect(mockExists).not.toHaveBeenCalled()
    expect(mockSign).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("signs afresh on every download and disables redirect caching", async () => {
    const first = await download(request(), params)
    mockSign.mockResolvedValue(
      "https://storage.example/bundle.zip?another-token",
    )
    const second = await download(request(), params)
    expect(first.status).toBe(307)
    expect(first.headers.get("cache-control")).toBe("private, no-store")
    expect(second.headers.get("location")).toContain("another-token")
    expect(mockSign).toHaveBeenCalledTimes(2)
  })

  it.each(["inspect", "sign"])(
    "preserves Completed when %s fails transiently",
    async (stage) => {
      if (stage === "inspect") mockExists.mockRejectedValue(new Error("503"))
      else mockSign.mockRejectedValue(new Error("503"))
      expect((await download(request(), params)).status).toBe(503)
      expect(mockUpdateMany).not.toHaveBeenCalled()
    },
  )

  it("marks a definitively missing object failed", async () => {
    mockExists.mockResolvedValue(false)
    expect((await download(request(), params)).status).toBe(410)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorClass: "ArtifactMissing" }),
      }),
    )
  })

  it("keeps a detached subscriber cancelled while another subscriber's run continues", async () => {
    mockFindUnique.mockResolvedValue({
      status: "Running",
      progress: 45,
      phase: "reading_history",
      params: {},
    })
    mockSubscription.mockResolvedValue({ cancelledAt: new Date() })
    expect(await (await GET(request(), params)).json()).toMatchObject({
      status: "cancelled",
      phase: "cancelled",
    })
  })

  it("does not cancel shared work when only one subscriber leaves", async () => {
    mockCancel.mockResolvedValue({ status: "cancelled" })
    expect(await (await DELETE(request(), params)).json()).toEqual({
      status: "cancelled",
    })
    expect(mockFinishCancel).not.toHaveBeenCalled()
  })

  it("detaches the caller even when stopping the run needs reconciliation", async () => {
    mockCancel.mockResolvedValue({ status: "cancelled", workflowRunId: "run" })
    mockFinishCancel.mockRejectedValue(new Error("Workflow offline"))
    expect(await (await DELETE(request(), params)).json()).toEqual({
      status: "cancelled",
    })
    expect(mockFinishCancel).toHaveBeenCalledWith("job", "run")
  })

  it("requires a valid cancellation capability", async () => {
    const response = await DELETE(
      new NextRequest("https://app.example/api/export/jobs/job"),
      params,
    )
    expect(response.status).toBe(403)
    expect(mockCancel).not.toHaveBeenCalled()
  })
})
