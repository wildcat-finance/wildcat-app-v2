/* eslint-disable no-await-in-loop, no-restricted-syntax */
// Chunks are fetched and committed one after another on purpose: a stopped
// scan must leave only fully saved ranges behind.

import { createHash } from "node:crypto"

import { utils } from "ethers"

import { ExportRpc } from "../../export/sources/rpc"
import { ExportChainId, JsonRpcLog } from "../../export/types"

// One log scan per chain for every market at once, instead of one scan per
// market. Three filters cover everything an analytics dataset needs:
//   MarketLogs    logs from every market plus the registry contracts
//   TransfersOut  asset transfers whose sender is a market
//   TransfersIn   asset transfers whose receiver is a market
// Topic positions combine with AND, so the two transfer directions need
// separate filters. Each committed block range is saved with its logs, so a
// stopped scan resumes and a committed range is never fetched again.

export type ScanFilter = "MarketLogs" | "TransfersOut" | "TransfersIn"

export type ScanRange = {
  chainId: number
  filter: ScanFilter
  fromBlock: number
  toBlock: number
  toBlockHash: string
  /** sha256 of the filter's sorted address set; ranges are reused per set */
  addressSet: string
  addresses: string[]
  logs: JsonRpcLog[]
}

export interface ScanRangeStore {
  /** Committed ranges of one filter whose address set covers `addresses`. */
  covering(
    chainId: number,
    filter: ScanFilter,
    addresses: string[],
    fromBlock: number,
    toBlock: number,
  ): Promise<ScanRange[]>
  /** Saving the same range twice is a no-op, so retries are safe. */
  save(range: ScanRange): Promise<void>
}

export type ChainScanTarget = {
  chainId: ExportChainId
  markets: string[]
  /** Registry contracts scanned with the markets (ArchController, HooksFactory). */
  registries: string[]
  assets: string[]
}

export type ChainScanResult = Record<ScanFilter, JsonRpcLog[]>

const TRANSFER_TOPIC = utils.id("Transfer(address,address,uint256)")
const DEFAULT_CHUNK_BLOCKS = 1_000_000
const PLASMA_CHUNK_BLOCKS = 200_000

const normalize = (addresses: string[]) =>
  [...new Set(addresses.map((address) => address.toLowerCase()))].sort()

export const addressSetKey = (addresses: string[]) =>
  createHash("sha256").update(normalize(addresses).join(",")).digest("hex")

const topicAddress = (address: string) =>
  utils.hexZeroPad(address.toLowerCase(), 32)

const logKey = (log: JsonRpcLog) =>
  `${log.transactionHash.toLowerCase()}:${BigInt(log.logIndex)}`

const sortLogs = (logs: JsonRpcLog[]) =>
  [...logs].sort((left, right) => {
    const block = Number(BigInt(left.blockNumber) - BigInt(right.blockNumber))
    return block || Number(BigInt(left.logIndex) - BigInt(right.logIndex))
  })

/**
 * Runs of ranges that can be stored as one: each starts the block after the
 * previous one ends, up to `maxLogs` logs per run. Ranges must share chain,
 * filter and address set. Runs of one range are left out.
 */
export function contiguousRuns<
  T extends Pick<ScanRange, "fromBlock" | "toBlock"> & { logCount: number },
>(ranges: T[], maxLogs: number) {
  const runs: T[][] = []
  let run: T[] = []
  let logs = 0
  const close = () => {
    if (run.length > 1) runs.push(run)
    run = []
    logs = 0
  }
  ;[...ranges]
    .sort((left, right) => left.fromBlock - right.fromBlock)
    .forEach((range) => {
      const last = run[run.length - 1]
      if (
        last &&
        (range.fromBlock !== last.toBlock + 1 ||
          logs + range.logCount > maxLogs)
      ) {
        close()
      }
      run.push(range)
      logs += range.logCount
    })
  close()
  return runs
}

/** Block intervals inside [fromBlock, toBlock] not covered by any range. */
export function uncoveredIntervals(
  ranges: Pick<ScanRange, "fromBlock" | "toBlock">[],
  fromBlock: number,
  toBlock: number,
) {
  const gaps: { fromBlock: number; toBlock: number }[] = []
  let next = fromBlock
  ;[...ranges]
    .sort((left, right) => left.fromBlock - right.fromBlock)
    .forEach((range) => {
      if (range.toBlock < next || range.fromBlock > toBlock) return
      if (range.fromBlock > next) {
        gaps.push({ fromBlock: next, toBlock: range.fromBlock - 1 })
      }
      next = Math.max(next, range.toBlock + 1)
    })
  if (next <= toBlock) gaps.push({ fromBlock: next, toBlock })
  return gaps
}

const filterRequests = (target: ChainScanTarget) => {
  const markets = normalize(target.markets)
  const marketTopics = markets.map(topicAddress)
  return {
    MarketLogs: {
      addresses: normalize([...markets, ...target.registries]),
      request: { address: normalize([...markets, ...target.registries]) },
    },
    TransfersOut: {
      addresses: normalize([...markets, ...target.assets]),
      request: {
        address: normalize(target.assets),
        topics: [TRANSFER_TOPIC, marketTopics],
      },
    },
    TransfersIn: {
      addresses: normalize([...markets, ...target.assets]),
      request: {
        address: normalize(target.assets),
        topics: [TRANSFER_TOPIC, null, marketTopics],
      },
    },
  } satisfies Record<
    ScanFilter,
    {
      addresses: string[]
      request: {
        address: string[]
        topics?: (string | string[] | null)[]
      }
    }
  >
}

export async function scanChain(
  rpc: ExportRpc,
  store: ScanRangeStore,
  target: ChainScanTarget,
  fromBlock: number,
  toBlock: number,
  options: {
    chunkBlocks?: number
    /** Filters to scan; the others come back empty. Defaults to all three. */
    filters?: ScanFilter[]
    onChunk?: (
      filter: ScanFilter,
      range: { fromBlock: number; toBlock: number },
    ) => void
  } = {},
): Promise<ChainScanResult> {
  const chunkBlocks =
    options.chunkBlocks ??
    ([9745, 9746].includes(target.chainId)
      ? PLASMA_CHUNK_BLOCKS
      : DEFAULT_CHUNK_BLOCKS)
  const requests = filterRequests(target)
  const result: ChainScanResult = {
    MarketLogs: [],
    TransfersOut: [],
    TransfersIn: [],
  }
  for (const filter of options.filters ??
    (Object.keys(requests) as ScanFilter[])) {
    const { addresses, request } = requests[filter]
    const addressSet = addressSetKey(addresses)
    const committed = await store.covering(
      target.chainId,
      filter,
      addresses,
      fromBlock,
      toBlock,
    )
    const logs = new Map<string, JsonRpcLog>()
    committed.forEach((range) =>
      range.logs.forEach((log) => {
        const block = Number(BigInt(log.blockNumber))
        if (block >= fromBlock && block <= toBlock) logs.set(logKey(log), log)
      }),
    )
    for (const gap of uncoveredIntervals(committed, fromBlock, toBlock)) {
      for (
        let start = gap.fromBlock;
        start <= gap.toBlock;
        start += chunkBlocks
      ) {
        const end = Math.min(gap.toBlock, start + chunkBlocks - 1)
        const [found, endBlock] = await Promise.all([
          rpc.getLogs({ ...request, fromBlock: start, toBlock: end }),
          rpc.getBlock(end),
        ])
        if (found.some((log) => log.removed)) {
          throw new Error(`Removed log in committed range ${start}-${end}`)
        }
        await store.save({
          chainId: target.chainId,
          filter,
          fromBlock: start,
          toBlock: end,
          toBlockHash: endBlock.hash.toLowerCase(),
          addressSet,
          addresses,
          logs: found,
        })
        found.forEach((log) => logs.set(logKey(log), log))
        options.onChunk?.(filter, { fromBlock: start, toBlock: end })
      }
    }
    result[filter] = sortLogs([...logs.values()])
  }
  return result
}

/**
 * Asset transfers touching any market, de-duplicated across both directions:
 * a transfer between two markets matches both filters.
 */
export const transfersTouchingMarkets = (result: ChainScanResult) => {
  const logs = new Map<string, JsonRpcLog>()
  ;[...result.TransfersOut, ...result.TransfersIn].forEach((log) =>
    logs.set(logKey(log), log),
  )
  return sortLogs([...logs.values()])
}

/** Logs relevant to one market: its own logs and transfers of its asset touching it. */
export const logsForMarket = (
  result: ChainScanResult,
  market: string,
  asset: string,
) => {
  const address = market.toLowerCase()
  const topic = topicAddress(address)
  return {
    marketLogs: result.MarketLogs.filter(
      (log) => log.address.toLowerCase() === address,
    ),
    assetTransfers: transfersTouchingMarkets(result).filter(
      (log) =>
        log.address.toLowerCase() === asset.toLowerCase() &&
        (log.topics[1]?.toLowerCase() === topic ||
          log.topics[2]?.toLowerCase() === topic),
    ),
  }
}

/**
 * Whether `market` is covered by committed ranges from its deployment block
 * to `toBlock` with no gaps, using any address set that included it.
 */
export const isMarketCovered = (
  ranges: Pick<ScanRange, "fromBlock" | "toBlock" | "addresses">[],
  market: string,
  deploymentBlock: number,
  toBlock: number,
) =>
  uncoveredIntervals(
    ranges.filter((range) => range.addresses.includes(market.toLowerCase())),
    deploymentBlock,
    toBlock,
  ).length === 0
