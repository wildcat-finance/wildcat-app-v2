/** @jest-environment node */
/* eslint-disable import/first */

jest.mock("@/lib/db", () => ({ prisma: {} }))

import { PrismaClient } from "@prisma/client"

import { claimPartBuildWithClient } from "./partBuild"

describe("shared market part claims", () => {
  const findUnique = jest.fn()
  const upsert = jest.fn()
  const transaction = {
    $executeRaw: jest.fn(),
    exportPartBuild: { findUnique, upsert },
  }
  const database = {
    $transaction: (fn: (tx: typeof transaction) => unknown) => fn(transaction),
  } as unknown as PrismaClient

  beforeEach(() => jest.clearAllMocks())

  it("waits for another active builder instead of rebuilding the same part", async () => {
    findUnique.mockResolvedValue({ jobId: "other", job: { status: "Running" } })
    expect(await claimPartBuildWithClient(database, "part", "caller")).toBe(
      false,
    )
    expect(upsert).not.toHaveBeenCalled()
  })

  it.each(["Failed", "Cancelled", "Completed"])(
    "takes over an abandoned claim from a %s job",
    async (status) => {
      findUnique.mockResolvedValue({ jobId: "other", job: { status } })
      expect(await claimPartBuildWithClient(database, "part", "caller")).toBe(
        true,
      )
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { jobId: "caller" } }),
      )
    },
  )

  it("lets a transiently failed step retry its own claim", async () => {
    findUnique.mockResolvedValue({
      jobId: "caller",
      job: { status: "Running" },
    })
    expect(await claimPartBuildWithClient(database, "part", "caller")).toBe(
      true,
    )
  })
})
