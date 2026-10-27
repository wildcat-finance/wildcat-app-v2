/** @jest-environment node */

import type { PrismaClient } from "@prisma/client"

import { auditMarket, pickAuditMarkets } from "./audit"
import { loadAnalyticsDataset } from "./datasets"
import { buildMarketDataset } from "../../export/ledger/buildMarketDataset"
import { EXPORT_PIPELINE_VERSION } from "../../export/version"

jest.mock("./datasets", () => ({
  ...jest.requireActual("./datasets"),
  loadAnalyticsDataset: jest.fn(),
}))
jest.mock("../../export/ledger/buildMarketDataset", () => ({
  buildMarketDataset: jest.fn(),
}))
jest.mock("../../export/sources/discovery", () => ({
  discoverMarketUniverse: async () => ({ markets: [{}] }),
}))
jest.mock("../../export/sources/rpc", () => ({ ExportRpcClient: jest.fn() }))
jest.mock("../../export/serialize/dataset", () => ({
  serializeDataset: (dataset: unknown) => Buffer.from(JSON.stringify(dataset)),
}))

const markets = Array.from({ length: 7 }, (_, index) => ({
  chainId: 1,
  address: `0x${String(index).repeat(40)}`,
  state: "Ok",
  stateReason: null as string | null,
  datasetKey: `ns/analytics/v${EXPORT_PIPELINE_VERSION}/1/0x${String(
    index,
  ).repeat(40)}/1-0x1.json.gz`,
}))
const currentKey = markets[0].datasetKey
const database = {
  glassDoorMarketStatus: { findMany: async () => markets },
} as unknown as PrismaClient

describe("pickAuditMarkets", () => {
  it("rotates through every market, a few per day", async () => {
    const day = 86_400_000
    const seen = new Set<string>()
    for (let index = 0; index < 3; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      const picked = await pickAuditMarkets(database, 3, index * day)
      expect(picked).toHaveLength(3)
      picked.forEach(({ address }) => seen.add(address))
    }
    expect(seen.size).toBe(markets.length)
  })

  it("audits every audit-flagged market again, besides the rotation", async () => {
    const flagged = [
      ...markets.slice(0, 5),
      { ...markets[5], state: "UnderReview", stateReason: "RPC timeout" },
      { ...markets[6], state: "UnderReview", stateReason: "Audit: differs" },
    ]
    const picked = await pickAuditMarkets(
      {
        glassDoorMarketStatus: { findMany: async () => flagged },
      } as unknown as PrismaClient,
      3,
      0,
    )
    expect(picked.map(({ address }) => address)).toEqual([
      markets[6].address,
      markets[0].address,
      markets[1].address,
      markets[2].address,
    ])
    expect(picked[0]).toEqual({ chainId: 1, address: markets[6].address })
  })

  it("skips datasets from an earlier pipeline version until they are rebuilt", async () => {
    const outdated = markets.map((market, index) =>
      index < 5
        ? { ...market, datasetKey: "ns/analytics/v1/1/0x/1.json.gz" }
        : market,
    )
    const picked = await pickAuditMarkets(
      {
        glassDoorMarketStatus: { findMany: async () => outdated },
      } as unknown as PrismaClient,
      3,
      0,
    )
    expect(picked.map(({ address }) => address).sort()).toEqual(
      [markets[5].address, markets[6].address].sort(),
    )
  })

  it("audits nothing before any market has a dataset", async () => {
    const empty = {
      glassDoorMarketStatus: { findMany: async () => [] },
    } as unknown as PrismaClient
    expect(await pickAuditMarkets(empty)).toEqual([])
  })
})

describe("auditMarket", () => {
  const stored = {
    snapshotBlock: 100,
    snapshotBlockHash: "0xabc",
    snapshotTimestamp: 1_700_000_000,
    events: [1],
  }
  const run = async (
    status: { state: string; stateReason: string | null },
    rebuilt: unknown,
  ) => {
    jest.mocked(loadAnalyticsDataset).mockResolvedValue(stored as never)
    jest.mocked(buildMarketDataset).mockResolvedValue(rebuilt as never)
    const update = jest.fn()
    const updateMany = jest.fn()
    const result = await auditMarket(
      {
        glassDoorMarketStatus: {
          findUniqueOrThrow: async () => ({
            ...status,
            datasetKey: currentKey,
          }),
          update,
          updateMany,
        },
      } as unknown as PrismaClient,
      1,
      markets[0].address,
    )
    return { result, update, updateMany }
  }

  it("flags a market whose full rebuild differs", async () => {
    const { result, update } = await run(
      { state: "Ok", stateReason: null },
      { ...stored, events: [2] },
    )
    expect(result).toMatchObject({ audited: true, identical: false })
    expect(update.mock.calls[0][0].data).toMatchObject({
      state: "UnderReview",
      stateReason: expect.stringMatching(/^Audit:/),
    })
  })

  it("clears an audit flag once a later audit passes", async () => {
    const { result, update, updateMany } = await run(
      { state: "UnderReview", stateReason: "Audit: differs" },
      stored,
    )
    expect(result).toMatchObject({ identical: true })
    expect(update).not.toHaveBeenCalled()
    expect(updateMany.mock.calls[0][0].data).toEqual({
      state: "Ok",
      stateReason: null,
    })
  })

  it("leaves a failed build's review state to the update", async () => {
    const { updateMany } = await run(
      { state: "UnderReview", stateReason: "RPC timeout" },
      stored,
    )
    expect(updateMany).not.toHaveBeenCalled()
  })
})
