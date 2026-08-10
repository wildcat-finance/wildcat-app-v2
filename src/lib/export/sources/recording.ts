/* eslint-disable max-classes-per-file, no-await-in-loop, no-empty-function, no-use-before-define, no-useless-constructor */

import { createHash } from "node:crypto"
import { gunzipSync, gzipSync } from "node:zlib"

import { ExportExplorer } from "./etherscan"
import { ExportRpc, hasCode, RpcCall, toBlockHex } from "./rpc"
import { ExportChainId, JsonRpcLog } from "../types"

type Recording = {
  version: 1
  rpc: Record<string, unknown>
  explorer: Record<string, unknown>
}

const key = (method: string, args: unknown[]) =>
  `${method}:${createHash("sha256").update(JSON.stringify(args)).digest("hex")}`

export class RecordingRpc implements ExportRpc {
  readonly usedProviderHosts: ReadonlySet<string>

  readonly responses: Record<string, unknown> = {}

  constructor(private readonly source: ExportRpc) {
    this.usedProviderHosts = source.usedProviderHosts
  }

  private async record<T>(method: string, args: unknown[], value: Promise<T>) {
    const result = await value
    this.responses[key(method, args)] = result
    return result
  }

  call<T>(method: string, params: unknown[]) {
    return this.record(
      "call",
      [method, params],
      this.source.call<T>(method, params),
    )
  }

  batch<T>(calls: RpcCall[], chunkSize?: number) {
    const value = this.source
      .batch<T>(calls, chunkSize)
      .then(
        (results) =>
          results.map((result, index) =>
            compactRpcResult(calls[index].method, result),
          ) as T[],
      )
    return this.record("batch", [calls, chunkSize], value)
  }

  getBlock(block: number | "latest" | "finalized") {
    const value = this.source.getBlock(block).then((result) => ({
      number: result.number,
      timestamp: result.timestamp,
      hash: result.hash,
    }))
    return this.record("getBlock", [block], value)
  }

  getLogs(filter: {
    address?: string
    fromBlock: number
    toBlock: number
    topics?: (string | string[] | null)[]
  }) {
    return this.record("getLogs", [filter], this.source.getLogs(filter))
  }

  async findDeploymentBlock(
    address: string,
    snapshotBlock: number,
  ): Promise<number> {
    return findDeploymentBlock(this, address, snapshotBlock)
  }

  async findBlockAtOrBefore(
    timestamp: number,
    highBlock: number,
  ): Promise<number> {
    return findBlockAtOrBefore(this, timestamp, highBlock)
  }

  async findBlocksAtOrBefore(
    timestamps: number[],
    highBlock: number,
  ): Promise<number[]> {
    return findBlocksAtOrBefore(this, timestamps, highBlock)
  }
}

function compactRpcResult(method: string, value: unknown): unknown {
  if (!value || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  if (method === "eth_getBlockByNumber") {
    return {
      number: record.number,
      timestamp: record.timestamp,
      hash: record.hash,
    }
  }
  if (method === "eth_getTransactionByHash") {
    return {
      hash: record.hash,
      blockHash: record.blockHash,
      from: record.from,
      to: record.to,
      input: record.input,
      blockNumber: record.blockNumber,
      transactionIndex: record.transactionIndex,
      value: record.value,
    }
  }
  if (method === "eth_getTransactionReceipt") {
    return {
      transactionHash: record.transactionHash,
      blockHash: record.blockHash,
      status: record.status,
      gasUsed: record.gasUsed,
      effectiveGasPrice: record.effectiveGasPrice,
      blockNumber: record.blockNumber,
      transactionIndex: record.transactionIndex,
      from: record.from,
      to: record.to,
      logs: [],
    }
  }
  return value
}

export class ReplayRpc implements ExportRpc {
  readonly usedProviderHosts = new Set(["recorded-fixture"])

  constructor(private readonly responses: Record<string, unknown>) {}

  private replay<T>(method: string, args: unknown[]): Promise<T> {
    const identity = key(method, args)
    if (!(identity in this.responses)) {
      throw new Error(`Fixture has no recorded response for ${identity}`)
    }
    return Promise.resolve(this.responses[identity] as T)
  }

  call<T>(method: string, params: unknown[]) {
    return this.replay<T>("call", [method, params])
  }

  batch<T>(calls: RpcCall[], chunkSize?: number) {
    return this.replay<T[]>("batch", [calls, chunkSize])
  }

  getBlock(block: number | "latest" | "finalized") {
    return this.replay<{ number: string; timestamp: string; hash: string }>(
      "getBlock",
      [block],
    )
  }

  getLogs(filter: {
    address?: string
    fromBlock: number
    toBlock: number
    topics?: (string | string[] | null)[]
  }): Promise<JsonRpcLog[]> {
    return this.replay("getLogs", [filter])
  }

  async findDeploymentBlock(
    address: string,
    snapshotBlock: number,
  ): Promise<number> {
    return findDeploymentBlock(this, address, snapshotBlock)
  }

  async findBlockAtOrBefore(
    timestamp: number,
    highBlock: number,
  ): Promise<number> {
    return findBlockAtOrBefore(this, timestamp, highBlock)
  }

  async findBlocksAtOrBefore(
    timestamps: number[],
    highBlock: number,
  ): Promise<number[]> {
    return findBlocksAtOrBefore(this, timestamps, highBlock)
  }
}

async function findDeploymentBlock(
  rpc: ExportRpc,
  address: string,
  snapshotBlock: number,
) {
  const latestCode = await rpc.call<string>("eth_getCode", [
    address,
    toBlockHex(snapshotBlock),
  ])
  if (!hasCode(latestCode)) throw new Error(`No contract code at ${address}`)
  let low = -1
  let high = snapshotBlock
  while (high - low > 1) {
    const middle = Math.floor((high + low) / 2)
    const code = await rpc.call<string>("eth_getCode", [
      address,
      toBlockHex(middle),
    ])
    if (hasCode(code)) high = middle
    else low = middle
  }
  return high
}

async function findBlockAtOrBefore(
  rpc: ExportRpc,
  timestamp: number,
  highBlock: number,
) {
  let low = 0
  let high = highBlock
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const block = await rpc.getBlock(middle)
    if (Number.parseInt(block.timestamp, 16) <= timestamp) low = middle
    else high = middle - 1
  }
  return low
}

async function findBlocksAtOrBefore(
  rpc: ExportRpc,
  timestamps: number[],
  highBlock: number,
) {
  const bounds = timestamps.map(() => ({ low: 0, high: highBlock }))
  while (bounds.some(({ low, high }) => low < high)) {
    const unresolved = bounds
      .map(({ low, high }, index) => ({
        index,
        block: Math.ceil((low + high) / 2),
      }))
      .filter(({ index }) => bounds[index].low < bounds[index].high)
    const uniqueBlocks = [...new Set(unresolved.map(({ block }) => block))]
    const blocks = await rpc.batch<{ timestamp: string }>(
      uniqueBlocks.map((block) => ({
        method: "eth_getBlockByNumber",
        params: [toBlockHex(block), false],
      })),
    )
    const timestampsByBlock = new Map(
      uniqueBlocks.map((block, index) => [
        block,
        Number.parseInt(blocks[index].timestamp, 16),
      ]),
    )
    unresolved.forEach(({ index, block }) => {
      if (timestampsByBlock.get(block)! <= timestamps[index]) {
        bounds[index].low = block
      } else {
        bounds[index].high = block - 1
      }
    })
  }
  return bounds.map(({ low }) => low)
}

export function recordingExplorer(source: ExportExplorer) {
  const responses: Record<string, unknown> = {}
  const explorer: ExportExplorer = {
    async getDirectFailedTransactionHashes(...args) {
      const result = await source.getDirectFailedTransactionHashes(...args)
      responses[key("failed", args)] = result
      return result
    },
    async getMarketLogs(...args) {
      const result = await source.getMarketLogs(...args)
      responses[key("logs", args)] = result
      return result
    },
  }
  return { explorer, responses }
}

export function replayExplorer(
  responses: Record<string, unknown>,
): ExportExplorer {
  const replay = <T>(method: string, args: unknown[]) => {
    const identity = key(method, args)
    if (!(identity in responses))
      throw new Error(`Missing explorer fixture ${identity}`)
    return Promise.resolve(responses[identity] as T)
  }
  return {
    getDirectFailedTransactionHashes: (...args) => replay("failed", args),
    getMarketLogs: (...args) => replay("logs", args),
  }
}

export function encodeRecording(
  rpc: RecordingRpc,
  explorer: Record<string, unknown>,
) {
  const recording: Recording = { version: 1, rpc: rpc.responses, explorer }
  const compressed = gzipSync(JSON.stringify(recording), {
    level: 9,
  })
  compressed.writeUInt32LE(0, 4)
  compressed[9] = 255
  return compressed
}

export function decodeRecording(buffer: Buffer) {
  const recording = JSON.parse(gunzipSync(buffer).toString("utf8")) as Recording
  if (recording.version !== 1)
    throw new Error("Unsupported fixture recording version")
  return {
    rpc: new ReplayRpc(recording.rpc),
    explorer: replayExplorer(recording.explorer),
  }
}

export type FixtureDescriptor = {
  chainId: ExportChainId
  marketAddress: string
  snapshotBlock: number
}
