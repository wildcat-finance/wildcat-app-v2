/** @jest-environment node */

import { cleanupExpiredExportJobs, EXPORT_CLEANUP_BATCH_SIZE } from "./cleanup"

describe("export cleanup", () => {
  it("removes storage objects before deleting terminal job rows", async () => {
    const calls: string[] = []
    const batches = [
      Array.from({ length: EXPORT_CLEANUP_BATCH_SIZE }, (_, index) => ({
        id: `a-${index}`,
        artifactKey: `a-${index}.zip`,
      })),
      [{ id: "b", artifactKey: null }],
    ]
    const database = {
      exportJob: {
        findMany: jest.fn(async () => batches.shift() ?? []),
        deleteMany: jest.fn(async () => {
          calls.push("delete")
        }),
      },
      exportArtifact: {
        findMany: jest.fn(async () => []),
        deleteMany: jest.fn(async () => undefined),
      },
    }
    const remove = jest.fn(async () => {
      calls.push("storage")
    })
    await expect(
      cleanupExpiredExportJobs(
        database,
        remove,
        new Date("2026-08-01T00:00:00Z"),
      ),
    ).resolves.toBe(EXPORT_CLEANUP_BATCH_SIZE + 1)
    expect(calls).toEqual(["storage", "delete", "storage", "delete"])
    expect(database.exportJob.findMany).toHaveBeenCalledTimes(2)
  })

  it("does not delete a row if storage deletion fails", async () => {
    const database = {
      exportJob: {
        findMany: jest.fn(async () => [{ id: "a", artifactKey: "a.zip" }]),
        deleteMany: jest.fn(),
      },
      exportArtifact: {
        findMany: jest.fn(async () => []),
        deleteMany: jest.fn(),
      },
    }
    await expect(
      cleanupExpiredExportJobs(database, async () => {
        throw new Error("storage unavailable")
      }),
    ).rejects.toThrow("storage unavailable")
    expect(database.exportJob.deleteMany).not.toHaveBeenCalled()
  })
})
