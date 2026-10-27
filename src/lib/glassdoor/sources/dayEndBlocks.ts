import { ExportRpc, fromHex, toBlockHex } from "../../export/sources/rpc"

// The last block of each UTC day, looked up once per chain and shared by
// every market. Per-market builds repeat this binary search for every
// market-day, which was about three quarters of their batched calls.

export type ChainDay = {
  chainId: number
  /** YYYY-MM-DD */
  day: string
  lastBlock: number
  blockHash: string
  blockTimestamp: number
}

export interface ChainDayStore {
  get(chainId: number, days: string[]): Promise<ChainDay[]>
  save(rows: ChainDay[]): Promise<void>
}

const dayEndTimestamp = (day: string) =>
  Date.parse(`${day}T00:00:00Z`) / 1_000 + 86_399

/**
 * Day-end blocks for `days`. Only days that ended at or before `highBlock`
 * (a finalized block) are resolved and stored; later days are omitted.
 */
export async function dayEndBlocks(
  rpc: ExportRpc,
  store: ChainDayStore,
  chainId: number,
  days: string[],
  highBlock: number,
): Promise<Map<string, ChainDay>> {
  const high = await rpc.getBlock(highBlock)
  const highTimestamp = fromHex(high.timestamp)
  const finished = [...new Set(days)]
    .filter((day) => dayEndTimestamp(day) < highTimestamp)
    .sort()
  const known = new Map(
    (await store.get(chainId, finished)).map((row) => [row.day, row]),
  )
  const missing = finished.filter((day) => !known.has(day))
  if (missing.length > 0) {
    const blocks = await rpc.findBlocksAtOrBefore(
      missing.map(dayEndTimestamp),
      highBlock,
    )
    const details = await rpc.batch<{ hash: string; timestamp: string }>(
      blocks.map((block) => ({
        method: "eth_getBlockByNumber",
        params: [toBlockHex(block), false],
      })),
    )
    const rows = missing.map((day, index) => ({
      chainId,
      day,
      lastBlock: blocks[index],
      blockHash: details[index].hash.toLowerCase(),
      blockTimestamp: fromHex(details[index].timestamp),
    }))
    await store.save(rows)
    rows.forEach((row) => known.set(row.day, row))
  }
  return known
}

const isDayEnd = (timestamp: number) => (timestamp + 1) % 86_400 === 0
const dayOf = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 10)

/**
 * A drop-in for ExportRpc.findBlocksAtOrBefore that answers finished UTC
 * day-ends from the shared table and everything else (such as a snapshot
 * block's own timestamp) with the normal search. The last block at or before
 * a timestamp does not depend on the search's upper bound, so the answers are
 * identical to a per-market search.
 */
export const sharedDayEndLookup =
  (rpc: ExportRpc, store: ChainDayStore, chainId: number) =>
  async (timestamps: number[], highBlock: number) => {
    const days = [...new Set(timestamps.filter(isDayEnd).map(dayOf))]
    const known =
      days.length > 0
        ? await dayEndBlocks(rpc, store, chainId, days, highBlock)
        : new Map<string, ChainDay>()
    const result: number[] = Array(timestamps.length)
    const remaining: number[] = []
    timestamps.forEach((timestamp, index) => {
      const row = isDayEnd(timestamp) ? known.get(dayOf(timestamp)) : undefined
      if (row) result[index] = row.lastBlock
      else remaining.push(index)
    })
    if (remaining.length > 0) {
      const searched = await rpc.findBlocksAtOrBefore(
        remaining.map((index) => timestamps[index]),
        highBlock,
      )
      remaining.forEach((index, position) => {
        result[index] = searched[position]
      })
    }
    return result
  }
