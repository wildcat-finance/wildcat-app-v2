/** @jest-environment node */
/* eslint-disable import/first, @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file, class-methods-use-this */

const mockRows = new Map<string, any>()
const mockObjects = new Map<string, Buffer>()
const mockClaims = jest.fn()
const mockSleep = jest.fn()
const mockBuild = jest.fn()
const mockPut = jest.fn()
const mockProgress = jest.fn()
const mockDeleteClaim = jest.fn()
const mockNamespace = "workflow-test"
const market = {
  chainId: 1,
  address: `0x${"2".repeat(40)}`,
  symbol: "TEST",
  deploymentBlock: 1,
}
const request = {
  chainId: 1,
  markets: [market.address],
  snapshotBlock: "100",
  snapshotBlockHash: `0x${"1".repeat(64)}`,
  statements: [],
  addresses: [],
  format: "pdf",
}

jest.mock("@/lib/db", () => ({
  prisma: {
    exportJob: {
      findUnique: async () => ({
        status: "Queued",
        params: request,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
      updateMany: (...args: unknown[]) => mockProgress(...args),
    },
    exportArtifact: {
      findMany: async () => [...mockRows.values()],
      findUnique: async ({ where }: any) => mockRows.get(where.key),
      findUniqueOrThrow: async ({ where }: any) => mockRows.get(where.key),
      upsert: async ({ where, create, update }: any) => {
        mockRows.set(
          where.key,
          mockRows.has(where.key)
            ? { ...mockRows.get(where.key), ...update }
            : create,
        )
      },
      deleteMany: async ({ where }: any) => mockRows.delete(where.key),
    },
    exportPartBuild: {
      deleteMany: (...args: unknown[]) => mockDeleteClaim(...args),
    },
  },
}))
jest.mock("workflow", () => ({
  FatalError: class FatalError extends Error {},
  sleep: (...args: unknown[]) => mockSleep(...args),
}))
jest.mock("./partBuild", () => ({
  claimPartBuild: (...args: unknown[]) => mockClaims(...args),
}))
jest.mock("./storage", () => ({
  exportObjectExists: async (key: string) => mockObjects.has(key),
  getExportObject: async (key: string) => mockObjects.get(key),
  putExportObject: (...args: unknown[]) => mockPut(...args),
}))
jest.mock("../config", () => ({
  getExportStorageNamespace: () => mockNamespace,
}))
jest.mock("../sources/discovery", () => ({
  discoverMarketUniverse: async () => ({ markets: [market], excludedV1: [] }),
}))
jest.mock("../sources/rpc", () => ({
  ExportRpcClient: class {
    async getBlock() {
      return { timestamp: "0x1", hash: request.snapshotBlockHash }
    }
  },
}))
jest.mock("../ledger/buildMarketDataset", () => ({
  buildMarketDataset: (...args: unknown[]) => mockBuild(...args),
}))
jest.mock("../bundle", () => ({
  buildExportBundle: async () => Buffer.from("bundle"),
}))

import { exportWorkflow } from "./exportWorkflow"
import { serializeDataset } from "../serialize/dataset"
import { EXPORT_PIPELINE_VERSION } from "../version"

const partKey = () =>
  `${mockNamespace}/parts/v${EXPORT_PIPELINE_VERSION}/1/100/${"1".repeat(64)}/${
    market.address
  }.json.gz`
const dataset = (provider: string) =>
  ({
    pipelineVersion: EXPORT_PIPELINE_VERSION,
    snapshotBlock: 100,
    snapshotBlockHash: request.snapshotBlockHash,
    market,
    events: [],
    transactions: [],
    interestAccruals: [],
    dailySeries: [],
    positions: {},
    manifest: { delinquencyEpisodes: [], rpcProviders: [provider] },
  }) as any

describe("market part publication through the export workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRows.clear()
    mockObjects.clear()
    mockClaims.mockResolvedValue(true)
    mockSleep.mockResolvedValue(undefined)
    mockProgress.mockResolvedValue({ count: 1 })
    mockBuild.mockResolvedValue(dataset("primary"))
    mockPut.mockImplementation(async (key: string, value: Buffer) => {
      if (mockObjects.has(key)) throw new Error("Already exists")
      mockObjects.set(key, value)
    })
  })

  it("does not poison retries after an upload failure followed by provider failover", async () => {
    mockPut.mockRejectedValueOnce(new Error("Failed to upload: temporary 503"))
    await expect(exportWorkflow("first")).rejects.toThrow("temporary 503")
    expect(mockRows.has(partKey())).toBe(false)
    mockBuild.mockResolvedValue(dataset("backup"))
    await expect(exportWorkflow("second")).resolves.toHaveProperty(
      "artifactKey",
    )
    expect(mockObjects.get(partKey())).toEqual(
      serializeDataset(dataset("backup")),
    )
  })

  it("replaces orphan metadata when no object was ever published", async () => {
    mockRows.set(partKey(), {
      key: partKey(),
      checksum: "abandoned",
      byteLength: 1,
    })
    await expect(exportWorkflow("job")).resolves.toHaveProperty("artifactKey")
    expect(mockRows.get(partKey()).checksum).not.toBe("abandoned")
  })

  it("adopts an uploaded part whose builder stopped before recording metadata", async () => {
    mockObjects.set(partKey(), serializeDataset(dataset("previous")))
    await expect(exportWorkflow("job")).resolves.toHaveProperty("artifactKey")
    expect(mockBuild).not.toHaveBeenCalled()
    expect(mockRows.get(partKey()).checksum).toBeDefined()
  })

  it("uses a concurrently published winner rather than rejecting different provider provenance", async () => {
    mockPut.mockImplementationOnce(async (key: string) => {
      mockObjects.set(key, serializeDataset(dataset("other-builder")))
      throw new Error("Already exists")
    })
    await expect(exportWorkflow("job")).resolves.toHaveProperty("artifactKey")
    expect(mockObjects.get(partKey())).toEqual(
      serializeDataset(dataset("other-builder")),
    )
  })

  it("suspends durably while another job builds the part, then reuses its result", async () => {
    mockClaims.mockResolvedValue(false)
    mockSleep.mockImplementationOnce(async () => {
      mockObjects.set(partKey(), serializeDataset(dataset("other")))
    })
    await expect(exportWorkflow("job")).resolves.toHaveProperty("artifactKey")
    expect(mockSleep).toHaveBeenCalledWith("10s")
    expect(mockBuild).not.toHaveBeenCalled()
  })
  it("tracks a failed bundle upload for cleanup without pinning its checksum", async () => {
    mockObjects.set(partKey(), serializeDataset(dataset("cached")))
    mockPut.mockRejectedValueOnce(new Error("Failed to upload bundle: 503"))
    await expect(exportWorkflow("job")).rejects.toThrow("503")
    expect([...mockRows.values()].some((row) => row.kind === "Bundle")).toBe(
      false,
    )
    expect(mockProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artifactKey: expect.stringContaining("/bundles/job/"),
        }),
      }),
    )
    await expect(exportWorkflow("job")).resolves.toHaveProperty("artifactKey")
  })
})
