/** @jest-environment node */

import { utils } from "ethers"

import {
  contiguousRuns,
  isMarketCovered,
  logsForMarket,
  scanChain,
  ScanRange,
  ScanRangeStore,
  transfersTouchingMarkets,
  uncoveredIntervals,
} from "./chainScan"
import {
  ChainDay,
  ChainDayStore,
  dayEndBlocks,
  sharedDayEndLookup,
} from "./dayEndBlocks"
import { ExportRpc } from "../../export/sources/rpc"
import { JsonRpcLog } from "../../export/types"

const MARKET_A = `0x${"a".repeat(40)}`
const MARKET_B = `0x${"b".repeat(40)}`
const REGISTRY = `0x${"c".repeat(40)}`
const ASSET = `0x${"d".repeat(40)}`
const LENDER = `0x${"e".repeat(40)}`
const TRANSFER = utils.id("Transfer(address,address,uint256)")
const pad = (address: string) => utils.hexZeroPad(address, 32)
const hex = (value: number) => `0x${value.toString(16)}`

const log = (
  block: number,
  index: number,
  address: string,
  topics: string[] = [],
): JsonRpcLog => ({
  address,
  blockNumber: hex(block),
  transactionHash: `0x${String(block).padStart(64, "0")}`,
  transactionIndex: "0x0",
  blockHash: `0x${"f".repeat(64)}`,
  logIndex: hex(index),
  removed: false,
  data: "0x",
  topics,
})

const chainLogs = [
  log(150, 0, MARKET_A),
  log(250, 0, REGISTRY),
  log(350, 1, ASSET, [TRANSFER, pad(LENDER), pad(MARKET_A)]),
  log(350, 2, ASSET, [TRANSFER, pad(MARKET_A), pad(MARKET_B)]),
  log(450, 0, MARKET_B),
  log(460, 0, ASSET, [TRANSFER, pad(LENDER), pad(LENDER)]),
]

const matches = (
  entry: JsonRpcLog,
  filter: {
    address?: string | string[]
    fromBlock: number
    toBlock: number
    topics?: (string | string[] | null)[]
  },
) => {
  const block = Number(entry.blockNumber)
  if (block < filter.fromBlock || block > filter.toBlock) return false
  const addresses = ([] as string[]).concat(filter.address ?? [])
  if (addresses.length && !addresses.includes(entry.address)) return false
  return (filter.topics ?? []).every((topic, position) => {
    if (topic === null) return true
    return ([] as string[]).concat(topic).includes(entry.topics[position])
  })
}

const fakeRpc = (failOnCall?: number) => {
  let calls = 0
  const rpc = {
    getLogsCalls: 0,
    async getLogs(filter: Parameters<ExportRpc["getLogs"]>[0]) {
      calls += 1
      rpc.getLogsCalls += 1
      if (calls === failOnCall) throw new Error("provider unavailable")
      return chainLogs.filter((entry) => matches(entry, filter))
    },
    async getBlock(block: number) {
      return {
        number: hex(block),
        hash: `0x${block.toString(16).padStart(64, "0")}`,
        timestamp: hex(block * 12),
      }
    },
    async findBlocksAtOrBefore(timestamps: number[]) {
      return timestamps.map((timestamp) => Math.floor(timestamp / 12))
    },
    async batch(requests: { params: unknown[] }[]) {
      return requests.map(({ params }) => {
        const block = Number(params[0])
        return {
          hash: `0x${block.toString(16).padStart(64, "0")}`,
          timestamp: hex(block * 12),
        }
      })
    },
  }
  return rpc
}

const memoryStore = () => {
  const ranges: ScanRange[] = []
  const store: ScanRangeStore & { ranges: ScanRange[] } = {
    ranges,
    async covering(chainId, filter, addresses, fromBlock, toBlock) {
      return ranges.filter(
        (range) =>
          range.chainId === chainId &&
          range.filter === filter &&
          addresses.every((address) => range.addresses.includes(address)) &&
          range.fromBlock <= toBlock &&
          range.toBlock >= fromBlock,
      )
    },
    async save(range) {
      const exists = ranges.some(
        (existing) =>
          existing.filter === range.filter &&
          existing.addressSet === range.addressSet &&
          existing.fromBlock === range.fromBlock,
      )
      if (!exists) ranges.push(range)
    },
  }
  return store
}

const target = {
  chainId: 1 as const,
  markets: [MARKET_A, MARKET_B],
  registries: [REGISTRY],
  assets: [ASSET],
}

describe("uncoveredIntervals", () => {
  it("returns the gaps between committed ranges", () => {
    expect(
      uncoveredIntervals(
        [
          { fromBlock: 120, toBlock: 199 },
          { fromBlock: 300, toBlock: 349 },
        ],
        100,
        400,
      ),
    ).toEqual([
      { fromBlock: 100, toBlock: 119 },
      { fromBlock: 200, toBlock: 299 },
      { fromBlock: 350, toBlock: 400 },
    ])
  })
})

describe("contiguousRuns", () => {
  const range = (fromBlock: number, toBlock: number, logCount = 1) => ({
    fromBlock,
    toBlock,
    logCount,
  })

  it("joins ranges that follow on directly, and leaves single ones alone", () => {
    expect(
      contiguousRuns(
        [range(21, 30), range(1, 10), range(11, 20), range(40, 50)],
        100,
      ),
    ).toEqual([[range(1, 10), range(11, 20), range(21, 30)]])
  })

  it("starts a new run before exceeding the log cap", () => {
    expect(
      contiguousRuns(
        [range(1, 10, 3), range(11, 20, 3), range(21, 30, 3), range(31, 40, 3)],
        6,
      ),
    ).toEqual([
      [range(1, 10, 3), range(11, 20, 3)],
      [range(21, 30, 3), range(31, 40, 3)],
    ])
  })
})

describe("scanChain", () => {
  it("scans each filter in chunks and reuses committed ranges on the next run", async () => {
    const rpc = fakeRpc()
    const store = memoryStore()
    const first = await scanChain(
      rpc as unknown as ExportRpc,
      store,
      target,
      100,
      499,
      {
        chunkBlocks: 200,
      },
    )
    expect(first.MarketLogs.map((entry) => entry.address)).toEqual([
      MARKET_A,
      REGISTRY,
      MARKET_B,
    ])
    expect(first.TransfersIn).toHaveLength(2)
    expect(first.TransfersOut).toHaveLength(1)
    expect(rpc.getLogsCalls).toBe(6)
    expect(store.ranges).toHaveLength(6)

    const again = await scanChain(
      rpc as unknown as ExportRpc,
      store,
      target,
      100,
      499,
      {
        chunkBlocks: 200,
      },
    )
    expect(rpc.getLogsCalls).toBe(6)
    expect(again).toEqual(first)
  })

  it("resumes after a failure without refetching committed chunks", async () => {
    const store = memoryStore()
    await expect(
      scanChain(fakeRpc(2) as unknown as ExportRpc, store, target, 100, 499, {
        chunkBlocks: 200,
      }),
    ).rejects.toThrow("provider unavailable")
    expect(store.ranges).toHaveLength(1)
    const rpc = fakeRpc()
    await scanChain(rpc as unknown as ExportRpc, store, target, 100, 499, {
      chunkBlocks: 200,
    })
    expect(rpc.getLogsCalls).toBe(5)
  })

  it("de-duplicates a transfer between two markets and splits logs by market", async () => {
    const result = await scanChain(
      fakeRpc() as unknown as ExportRpc,
      memoryStore(),
      target,
      100,
      499,
    )
    expect(transfersTouchingMarkets(result)).toHaveLength(2)
    const forB = logsForMarket(result, MARKET_B, ASSET)
    expect(forB.marketLogs).toHaveLength(1)
    expect(forB.assetTransfers).toHaveLength(1)
  })
})

describe("isMarketCovered", () => {
  it("accepts coverage split across address sets that included the market", () => {
    const ranges = [
      { fromBlock: 100, toBlock: 299, addresses: [MARKET_A] },
      { fromBlock: 300, toBlock: 499, addresses: [MARKET_A, MARKET_B] },
    ]
    expect(isMarketCovered(ranges, MARKET_A, 100, 499)).toBe(true)
    expect(isMarketCovered(ranges, MARKET_B, 100, 499)).toBe(false)
    expect(isMarketCovered(ranges, MARKET_B, 300, 499)).toBe(true)
  })
})

describe("dayEndBlocks", () => {
  it("resolves finished days once and leaves days after the high block unresolved", async () => {
    const saved: ChainDay[] = []
    const store: ChainDayStore = {
      async get(chainId, days) {
        return saved.filter((row) => days.includes(row.day))
      },
      async save(rows) {
        saved.push(...rows)
      },
    }
    const rpc = fakeRpc()
    const findBlocks = jest.spyOn(rpc, "findBlocksAtOrBefore")
    const high = Date.parse("2026-01-03T12:00:00Z") / 1000 / 12
    const days = ["2026-01-01", "2026-01-02", "2026-01-03"]
    const first = await dayEndBlocks(
      rpc as unknown as ExportRpc,
      store,
      1,
      days,
      high,
    )
    expect([...first.keys()]).toEqual(["2026-01-01", "2026-01-02"])
    expect(first.get("2026-01-01")?.lastBlock).toBe(
      Math.floor(Date.parse("2026-01-01T23:59:59Z") / 1000 / 12),
    )
    await dayEndBlocks(rpc as unknown as ExportRpc, store, 1, days, high)
    expect(findBlocks).toHaveBeenCalledTimes(1)
  })
})

describe("sharedDayEndLookup", () => {
  it("answers exactly like the per-market search and reuses stored day-ends", async () => {
    const saved: ChainDay[] = []
    const store: ChainDayStore = {
      async get(chainId, days) {
        return saved.filter((row) => days.includes(row.day))
      },
      async save(rows) {
        saved.push(...rows)
      },
    }
    const rpc = fakeRpc()
    const high = Date.parse("2026-01-04T00:00:00Z") / 1000 / 12
    const timestamps = [
      Date.parse("2026-01-01T23:59:59Z") / 1000,
      Date.parse("2026-01-02T23:59:59Z") / 1000,
      Date.parse("2026-01-03T10:00:00Z") / 1000,
    ]
    const expected = await rpc.findBlocksAtOrBefore(timestamps)
    const lookup = sharedDayEndLookup(rpc as unknown as ExportRpc, store, 1)
    expect(await lookup(timestamps, high)).toEqual(expected)
    expect(saved.map((row) => row.day)).toEqual(["2026-01-01", "2026-01-02"])
    const search = jest.spyOn(rpc, "findBlocksAtOrBefore")
    expect(await lookup(timestamps, high)).toEqual(expected)
    expect(search).toHaveBeenCalledTimes(1)
    expect(search.mock.calls[0][0]).toEqual([timestamps[2]])
  })
})
