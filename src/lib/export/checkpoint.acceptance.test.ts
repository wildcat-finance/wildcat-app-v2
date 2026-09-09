/** @jest-environment node */
/* eslint-disable class-methods-use-this, max-classes-per-file, no-await-in-loop, no-empty-function, no-restricted-syntax, no-useless-constructor */

import { readFile } from "node:fs/promises"
import path from "node:path"

import { buildMarketDataset } from "./ledger/buildMarketDataset"
import { serializeDataset } from "./serialize/dataset"
import { discoverMarketUniverse } from "./sources/discovery"
import { ExportExplorer } from "./sources/etherscan"
import { decodeRecording } from "./sources/recording"
import {
  ExportRpc,
  fromHex,
  LogProgress,
  RpcCall,
  toBlockHex,
} from "./sources/rpc"
import { JsonRpcLog, MarketDataset } from "./types"

const MARKET = "0x14da929b9d44b74ce5937fb2527ba6abe5872b89"
const SNAPSHOT = 25_632_396

const callKey = (method: string, params: unknown[]) =>
  JSON.stringify([method, params])

class MemoRpc implements ExportRpc {
  readonly usedProviderHosts: ReadonlySet<string>

  private readonly calls = new Map<string, unknown>()

  private readonly blocks = new Map<
    number | "latest" | "finalized",
    { number: string; timestamp: string; hash: string }
  >()

  private readonly logRanges: {
    filter: Parameters<ExportRpc["getLogs"]>[0]
    logs: JsonRpcLog[]
  }[] = []

  constructor(private readonly source: ExportRpc) {
    this.usedProviderHosts = source.usedProviderHosts
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const identity = callKey(method, params)
    if (this.calls.has(identity)) return this.calls.get(identity) as T
    const result = await this.source.call<T>(method, params)
    this.calls.set(identity, result)
    return result
  }

  async batch<T>(calls: RpcCall[], chunkSize?: number): Promise<T[]> {
    const cached = calls.map((call) =>
      this.calls.get(callKey(call.method, call.params)),
    )
    if (cached.every((value) => value !== undefined)) return cached as T[]
    const results = await this.source.batch<T>(calls, chunkSize)
    calls.forEach((call, index) => {
      this.calls.set(callKey(call.method, call.params), results[index])
    })
    return results
  }

  async getBlock(block: number | "latest" | "finalized") {
    const cachedBlock = this.blocks.get(block)
    if (cachedBlock) return cachedBlock
    if (typeof block === "number") {
      const cachedCall = this.calls.get(
        callKey("eth_getBlockByNumber", [toBlockHex(block), false]),
      ) as { number: string; timestamp: string; hash: string } | undefined
      if (cachedCall) {
        this.blocks.set(block, cachedCall)
        return cachedCall
      }
    }
    const result = await this.source.getBlock(block)
    this.blocks.set(block, result)
    return result
  }

  async getLogs(
    filter: Parameters<ExportRpc["getLogs"]>[0],
    onProgress?: LogProgress,
  ) {
    const containing = this.logRanges.find(
      (range) =>
        range.filter.address === filter.address &&
        JSON.stringify(range.filter.topics) === JSON.stringify(filter.topics) &&
        range.filter.fromBlock <= filter.fromBlock &&
        range.filter.toBlock >= filter.toBlock,
    )
    if (containing) {
      const logs = containing.logs.filter((log) => {
        const block = fromHex(log.blockNumber)
        return block >= filter.fromBlock && block <= filter.toBlock
      })
      await onProgress?.(1, 1)
      return logs
    }
    const logs = await this.source.getLogs(filter, onProgress)
    this.logRanges.push({ filter, logs })
    return logs
  }

  async findDeploymentBlock(address: string, snapshotBlock: number) {
    const latestCode = await this.call<string>("eth_getCode", [
      address,
      toBlockHex(snapshotBlock),
    ])
    if (latestCode === "0x") throw new Error(`No contract code at ${address}`)
    let low = -1
    let high = snapshotBlock
    while (high - low > 1) {
      const middle = Math.floor((high + low) / 2)
      const code = await this.call<string>("eth_getCode", [
        address,
        toBlockHex(middle),
      ])
      if (code === "0x") low = middle
      else high = middle
    }
    return high
  }

  async findBlockAtOrBefore(timestamp: number, highBlock: number) {
    return (await this.findBlocksAtOrBefore([timestamp], highBlock))[0]
  }

  async findBlocksAtOrBefore(timestamps: number[], highBlock: number) {
    const bounds = timestamps.map(() => ({ low: 0, high: highBlock }))
    while (bounds.some(({ low, high }) => low < high)) {
      const unresolved = bounds
        .map(({ low, high }, index) => ({
          index,
          block: Math.ceil((low + high) / 2),
        }))
        .filter(({ index }) => bounds[index].low < bounds[index].high)
      const uniqueBlocks = [...new Set(unresolved.map(({ block }) => block))]
      const blocks = await this.batch<{ timestamp: string }>(
        uniqueBlocks.map((block) => ({
          method: "eth_getBlockByNumber",
          params: [toBlockHex(block), false],
        })),
      )
      const byBlock = new Map(
        uniqueBlocks.map((block, index) => [
          block,
          fromHex(blocks[index].timestamp),
        ]),
      )
      unresolved.forEach(({ index, block }) => {
        if (byBlock.get(block)! <= timestamps[index]) bounds[index].low = block
        else bounds[index].high = block - 1
      })
    }
    return bounds.map(({ low }) => low)
  }

  transactionBlock(hash: string) {
    for (const [identity, value] of this.calls) {
      if (
        identity === callKey("eth_getTransactionByHash", [hash]) &&
        value &&
        typeof value === "object"
      ) {
        return fromHex((value as { blockNumber: string }).blockNumber)
      }
    }
    throw new Error(`Transaction ${hash} was not memoized`)
  }
}

const logBlock = (value: { blockNumber: string }) =>
  value.blockNumber.startsWith("0x")
    ? Number.parseInt(value.blockNumber, 16)
    : Number.parseInt(value.blockNumber, 10)

class MemoExplorer implements ExportExplorer {
  private failed?: string[]

  private marketLogs?: Awaited<ReturnType<ExportExplorer["getMarketLogs"]>>

  private transfers?: Awaited<
    ReturnType<ExportExplorer["getTransferLogsMentioningAddress"]>
  >

  constructor(
    private readonly source: ExportExplorer,
    private readonly rpc: MemoRpc,
  ) {}

  async getDirectFailedTransactionHashes(
    ...args: Parameters<ExportExplorer["getDirectFailedTransactionHashes"]>
  ) {
    if (!this.failed) {
      this.failed = await this.source.getDirectFailedTransactionHashes(...args)
      return this.failed
    }
    const fromBlock = args[2]
    const toBlock = args[3]
    return this.failed.filter((hash) => {
      const block = this.rpc.transactionBlock(hash)
      return block >= fromBlock && block <= toBlock
    })
  }

  async getMarketLogs(...args: Parameters<ExportExplorer["getMarketLogs"]>) {
    if (!this.marketLogs) {
      this.marketLogs = await this.source.getMarketLogs(...args)
      return this.marketLogs
    }
    return this.marketLogs.filter((log) => {
      const block = logBlock(log)
      return block >= args[2] && block <= args[3]
    })
  }

  async getTransferLogsMentioningAddress(
    ...args: Parameters<ExportExplorer["getTransferLogsMentioningAddress"]>
  ) {
    if (!this.transfers) {
      this.transfers = await this.source.getTransferLogsMentioningAddress(
        ...args,
      )
      return this.transfers
    }
    return this.transfers.filter((log) => {
      const block = logBlock(log)
      return block >= args[2] && block <= args[3]
    })
  }
}

const checkpointFrom = async (
  dataset: MarketDataset,
  rpc: MemoRpc,
): Promise<MarketDataset> => {
  const cutoffEvent = dataset.events[Math.floor(dataset.events.length * 0.8)]
  const snapshotBlock = cutoffEvent.blockNumber
  const snapshot = await rpc.getBlock(snapshotBlock)
  const snapshotTimestamp = fromHex(snapshot.timestamp)
  const events = dataset.events.filter(
    (event) => event.blockNumber <= snapshotBlock,
  )
  const marketClosedEvents = events.filter(
    (event) => event.name === "MarketClosed",
  )
  return {
    ...dataset,
    snapshotBlock,
    snapshotBlockHash: snapshot.hash,
    snapshotTimestamp,
    events,
    transactions: dataset.transactions.filter(
      (row) => row.blockNumber <= snapshotBlock,
    ),
    interestAccruals: dataset.interestAccruals.filter(
      (row) => row.blockNumber <= snapshotBlock,
    ),
    dailySeries: dataset.dailySeries.filter(
      (row) =>
        row.date_utc <=
        new Date(snapshotTimestamp * 1_000).toISOString().slice(0, 10),
    ),
    positions: {},
    manifest: {
      ...dataset.manifest,
      excludedTransfers: dataset.manifest.excludedTransfers.filter(
        (transfer) => Number(transfer.block_number) <= snapshotBlock,
      ),
      crossChecks: {
        etherscanLogCount: events.length,
        rpcLogCount: events.length,
        logSetsEqual: true,
        marketClosedEventCount: marketClosedEvents.length,
        ...(marketClosedEvents[0]
          ? { marketClosedBlock: marketClosedEvents[0].blockNumber }
          : {}),
      },
    },
  }
}

describe("market-data checkpoints", () => {
  it("extends an earlier verified checkpoint to the same bytes as a cold build", async () => {
    const recording = decodeRecording(
      await readFile(
        path.join(
          process.cwd(),
          "src/lib/export/__fixtures__/reference-market-a-25632396.json.gz",
        ),
      ),
    )
    const rpc = new MemoRpc(recording.rpc)
    const explorer = new MemoExplorer(recording.explorer, rpc)
    const market = (await discoverMarketUniverse(rpc, 1, SNAPSHOT, [MARKET]))
      .markets[0]
    const snapshot = await rpc.getBlock(SNAPSHOT)
    const cold = await buildMarketDataset(
      rpc,
      market,
      SNAPSHOT,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
      explorer,
    )
    const checkpoint = await checkpointFrom(cold, rpc)
    const extended = await buildMarketDataset(
      rpc,
      market,
      SNAPSHOT,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
      explorer,
      undefined,
      checkpoint,
    )

    expect(extended.dailySeries).toEqual(cold.dailySeries)
    expect(extended.events).toEqual(cold.events)
    expect(extended.transactions).toEqual(cold.transactions)
    expect(serializeDataset(extended)).toEqual(serializeDataset(cold))

    await expect(
      buildMarketDataset(
        rpc,
        market,
        SNAPSHOT,
        snapshot.hash,
        fromHex(snapshot.timestamp),
        [],
        explorer,
        undefined,
        { ...checkpoint, snapshotBlockHash: `0x${"0".repeat(64)}` },
      ),
    ).rejects.toThrow(
      `Market-data checkpoint block ${checkpoint.snapshotBlock} is no longer canonical`,
    )
  }, 120_000)
})
