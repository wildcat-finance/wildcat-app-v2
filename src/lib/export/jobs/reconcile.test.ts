/** @jest-environment node */
/* eslint-disable import/first */

const mockFindMany = jest.fn()
const mockUpdateMany = jest.fn()
const mockGetRun = jest.fn()

jest.mock("@/lib/db", () => ({
  prisma: {
    exportJob: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))
jest.mock("workflow/api", () => ({
  getRun: (...args: unknown[]) => mockGetRun(...args),
}))

import { reconcileExportJobs } from "./reconcile"

describe("export workflow reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 1 })
  })

  it("fails a queued job whose workflow never started", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "job",
        status: "Queued",
        workflowRunId: null,
        createdAt: new Date("2026-08-10T00:00:00Z"),
      },
    ])
    await expect(
      reconcileExportJobs(new Date("2026-08-10T00:03:00Z")),
    ).resolves.toBe(1)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorClass: "WorkflowMissing" }),
      }),
    )
  })

  it("maps a cancelled Workflow run to a cancelled export", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "job",
        status: "Running",
        workflowRunId: "run",
        createdAt: new Date("2026-08-10T00:00:00Z"),
      },
    ])
    mockGetRun.mockReturnValue({ status: Promise.resolve("cancelled") })
    await expect(reconcileExportJobs()).resolves.toBe(1)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "Cancelled" }),
      }),
    )
  })

  it("does not fail a job when Workflow status lookup is unavailable", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "job",
        status: "Running",
        workflowRunId: "run",
        createdAt: new Date("2026-08-10T00:00:00Z"),
      },
    ])
    mockGetRun.mockReturnValue({ status: Promise.reject(new Error("offline")) })
    await expect(reconcileExportJobs()).resolves.toBe(0)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})
