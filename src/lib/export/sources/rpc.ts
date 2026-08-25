/* eslint-disable class-methods-use-this, max-classes-per-file, no-await-in-loop, no-plusplus, no-restricted-syntax, no-use-before-define */

import { getExportRpcUrls } from "../config"
import {
  ProviderThrottleError,
  waitForProviderSlot,
} from "../jobs/providerThrottle"
import { ExportChainId, JsonRpcLog } from "../types"

export type RpcCall = { method: string; params: unknown[] }
export type LogProgress = (
  completedWindows: number,
  totalWindows: number,
) => void | Promise<void>
export type ExportRpc = {
  readonly usedProviderHosts: ReadonlySet<string>
  call<T>(method: string, params: unknown[]): Promise<T>
  batch<T>(calls: RpcCall[], chunkSize?: number): Promise<T[]>
  getBlock(block: number | "latest" | "finalized"): Promise<{
    number: string
    timestamp: string
    hash: string
  }>
  getLogs(
    filter: {
      address?: string
      fromBlock: number
      toBlock: number
      topics?: (string | string[] | null)[]
    },
    onProgress?: LogProgress,
  ): Promise<JsonRpcLog[]>
  findDeploymentBlock(address: string, snapshotBlock: number): Promise<number>
  findBlockAtOrBefore(timestamp: number, highBlock: number): Promise<number>
  findBlocksAtOrBefore(
    timestamps: number[],
    highBlock: number,
  ): Promise<number[]>
}
type RpcResponse<T> = {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: { code: number; message: string }
}

const validateRpcResponse = <T>(
  value: unknown,
  expectedId: number,
  method: string,
): RpcResponse<T> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExportRpcError(`${method} returned an invalid JSON-RPC envelope`)
  }
  const response = value as Partial<RpcResponse<T>>
  if (response.jsonrpc !== "2.0" || response.id !== expectedId) {
    throw new ExportRpcError(
      `${method} returned a mismatched JSON-RPC response`,
    )
  }
  const hasResult = Object.prototype.hasOwnProperty.call(response, "result")
  const hasError = Object.prototype.hasOwnProperty.call(response, "error")
  if (hasResult === hasError) {
    throw new ExportRpcError(`${method} returned neither result nor error`)
  }
  return response as RpcResponse<T>
}

export class ExportRpcError extends Error {
  constructor(
    message: string,
    readonly retryable = true,
    readonly category: "transport" | "range" | "deterministic" = "transport",
    readonly retryAfterMs = 0,
  ) {
    super(message)
  }
}

const rpcError = (method: string, error: { code: number; message: string }) => {
  const range =
    error.code === -32005 ||
    /too many results|response size|block range|query timeout|limit exceeded/i.test(
      error.message,
    )
  const deterministic = /invalid argument|execution reverted/i.test(
    error.message,
  )
  let category: ExportRpcError["category"] = "transport"
  if (range) category = "range"
  else if (deterministic) category = "deterministic"
  return new ExportRpcError(
    `${method} failed: ${error.code} ${error.message}`,
    !deterministic,
    category,
  )
}

const DEFAULT_LOG_BLOCK_WINDOW = 50_000
const PLASMA_LOG_BLOCK_WINDOW = 10_000
const LOG_CONCURRENCY = 3
const RPC_MIN_REQUEST_INTERVAL_MS = 100
const RPC_ATTEMPTS = 4

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const retryDelay = (attempt: number, error: unknown) =>
  Math.max(
    1_000 * 2 ** attempt,
    error instanceof ExportRpcError ? error.retryAfterMs : 0,
  )

const retryAfterMs = (value: string | null) => {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now())
}

const fixedHex = (value: unknown, bytes: number) =>
  typeof value === "string" &&
  new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`, "i").test(value)

export const normalizeRpcLog = (value: unknown): JsonRpcLog => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExportRpcError("eth_getLogs returned an invalid log", false)
  }
  const log = value as Partial<JsonRpcLog>
  if (
    !fixedHex(log.address, 20) ||
    !fixedHex(log.blockHash, 32) ||
    !fixedHex(log.transactionHash, 32) ||
    !Array.isArray(log.topics) ||
    !log.topics.every((topic) => fixedHex(topic, 32)) ||
    typeof log.data !== "string" ||
    !/^0x(?:[0-9a-f]{2})*$/i.test(log.data) ||
    typeof log.removed !== "boolean"
  ) {
    throw new ExportRpcError("eth_getLogs returned malformed log fields", false)
  }
  fromHex(log.blockNumber)
  fromHex(log.transactionIndex)
  fromHex(log.logIndex)
  return {
    address: log.address!.toLowerCase(),
    blockHash: log.blockHash!.toLowerCase(),
    blockNumber: log.blockNumber!,
    data: log.data.toLowerCase(),
    logIndex: log.logIndex!,
    removed: log.removed,
    topics: log.topics.map((topic) => topic.toLowerCase()),
    transactionHash: log.transactionHash!.toLowerCase(),
    transactionIndex: log.transactionIndex!,
  }
}

export const normalizeRpcBlock = (value: unknown, expectedNumber?: number) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExportRpcError(
      "eth_getBlockByNumber returned no valid block",
      false,
    )
  }
  const block = value as { number?: string; timestamp?: string; hash?: string }
  if (!fixedHex(block.hash, 32)) {
    throw new ExportRpcError(
      "eth_getBlockByNumber returned no valid block",
      false,
    )
  }
  const number = fromHex(block.number)
  fromHex(block.timestamp)
  if (expectedNumber !== undefined && number !== expectedNumber) {
    throw new ExportRpcError(
      `eth_getBlockByNumber returned block ${number}, expected ${expectedNumber}`,
      false,
    )
  }
  return {
    number: block.number!,
    timestamp: block.timestamp!,
    hash: block.hash!.toLowerCase(),
  }
}

export class ExportRpcClient implements ExportRpc {
  private nextId = 1

  private activeProvider = 0

  private readonly providerValidations = new Map<number, Promise<void>>()

  readonly providerHosts: string[]

  readonly usedProviderHosts = new Set<string>()

  constructor(
    readonly chainId: ExportChainId,
    private readonly urls = getExportRpcUrls()[chainId],
  ) {
    this.providerHosts = urls.map((url) => new URL(url).host)
  }

  private async post<T>(url: string, payload: unknown): Promise<T> {
    await waitForProviderSlot(
      `rpc:${new URL(url).host}`,
      RPC_MIN_REQUEST_INTERVAL_MS,
      50,
    )
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) {
      const retryAfter = retryAfterMs(
        response.headers?.get("retry-after") ?? null,
      )
      try {
        const body = (await response.json()) as {
          id?: unknown
          error?: { code?: unknown; message?: unknown }
        }
        const requests = Array.isArray(payload) ? payload : [payload]
        const request = requests.find(
          (candidate) =>
            candidate &&
            typeof candidate === "object" &&
            "id" in candidate &&
            candidate.id === body.id,
        ) as { method?: unknown } | undefined
        if (
          typeof request?.method === "string" &&
          typeof body.error?.code === "number" &&
          typeof body.error.message === "string"
        ) {
          const error = rpcError(request.method, {
            code: body.error.code,
            message: body.error.message,
          })
          throw new ExportRpcError(
            `RPC HTTP ${response.status}: ${error.message}`,
            error.retryable,
            error.category,
            retryAfter,
          )
        }
      } catch (error) {
        if (error instanceof ExportRpcError) throw error
      }
      throw new ExportRpcError(
        `RPC HTTP ${response.status}`,
        true,
        "transport",
        retryAfter,
      )
    }
    return response.json() as Promise<T>
  }

  private ensureProvider(provider: number) {
    const existing = this.providerValidations.get(provider)
    if (existing) return existing
    const validation = (async () => {
      const id = this.nextId++
      const raw = await this.post<unknown>(this.urls[provider], {
        jsonrpc: "2.0",
        id,
        method: "eth_chainId",
        params: [],
      })
      const response = validateRpcResponse<string>(raw, id, "eth_chainId")
      if (response.error) throw rpcError("eth_chainId", response.error)
      if (fromHex(response.result) !== this.chainId) {
        throw new ExportRpcError(
          `RPC provider ${this.providerHosts[provider]} is on the wrong chain`,
          false,
          "deterministic",
        )
      }
    })().catch((error) => {
      this.providerValidations.delete(provider)
      throw error
    })
    this.providerValidations.set(provider, validation)
    return validation
  }

  private async withProvider<T>(request: (provider: number) => Promise<T>) {
    let lastError: unknown
    for (let attempt = 0; attempt < RPC_ATTEMPTS; attempt += 1) {
      let onlyRangeErrors = true
      for (let offset = 0; offset < this.urls.length; offset += 1) {
        const provider = (this.activeProvider + offset) % this.urls.length
        try {
          await this.ensureProvider(provider)
          const result = await request(provider)
          this.activeProvider = provider
          this.usedProviderHosts.add(this.providerHosts[provider])
          return result
        } catch (error) {
          lastError = error
          if (error instanceof ProviderThrottleError) throw error
          if (error instanceof ExportRpcError && !error.retryable) throw error
          if (!(error instanceof ExportRpcError) || error.category !== "range")
            onlyRangeErrors = false
        }
      }
      if (
        onlyRangeErrors &&
        lastError instanceof ExportRpcError &&
        lastError.category === "range"
      ) {
        throw lastError
      }
      if (attempt < RPC_ATTEMPTS - 1) {
        await sleep(retryDelay(attempt, lastError))
      }
    }
    throw lastError
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    try {
      return await this.withProvider(async (provider) => {
        const id = this.nextId++
        const raw = await this.post<unknown>(this.urls[provider], {
          jsonrpc: "2.0",
          id,
          method,
          params,
        })
        const response = validateRpcResponse<T>(raw, id, method)
        if (response.error) throw rpcError(method, response.error)
        return response.result as T
      })
    } catch (error) {
      if (error instanceof ProviderThrottleError) throw error
      if (
        error instanceof ExportRpcError &&
        (!error.retryable || error.category === "range")
      ) {
        throw error
      }
      throw new ExportRpcError(
        `${method} failed on every configured provider: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  async batch<T>(calls: RpcCall[], chunkSize = 40): Promise<T[]> {
    const results: T[] = []
    for (let start = 0; start < calls.length; start += chunkSize) {
      const chunk = calls.slice(start, start + chunkSize)
      const payload = chunk.map(({ method, params }) => ({
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        params,
      }))
      const byId = new Map(payload.map((item, index) => [item.id, index]))
      try {
        const ordered = await this.withProvider(async (provider) => {
          const raw = await this.post<unknown>(this.urls[provider], payload)
          if (!Array.isArray(raw)) {
            throw new ExportRpcError("RPC batch returned a non-array response")
          }
          const seen = new Set<number>()
          const responses = raw.map((response) => {
            const id = (response as { id?: unknown })?.id
            if (typeof id !== "number" || !byId.has(id) || seen.has(id)) {
              throw new ExportRpcError(
                "RPC batch returned an invalid response ID",
              )
            }
            seen.add(id)
            return validateRpcResponse<T>(
              response,
              id,
              payload[byId.get(id)!].method,
            )
          })
          const candidate: T[] = Array(chunk.length)
          for (const response of responses) {
            if (response.error) {
              throw rpcError(
                payload[byId.get(response.id)!].method,
                response.error,
              )
            }
            candidate[byId.get(response.id)!] = response.result as T
          }
          if (seen.size !== chunk.length) {
            throw new ExportRpcError("RPC batch omitted a response")
          }
          return candidate
        })
        results.push(...ordered)
      } catch (error) {
        if (
          chunk.length > 1 &&
          error instanceof ExportRpcError &&
          error.category === "range"
        ) {
          const middle = Math.ceil(chunk.length / 2)
          results.push(...(await this.batch<T>(chunk.slice(0, middle), middle)))
          results.push(...(await this.batch<T>(chunk.slice(middle), middle)))
        } else {
          throw error
        }
      }
    }
    return results
  }

  async getBlock(block: number | "latest" | "finalized") {
    const result = await this.call<unknown>("eth_getBlockByNumber", [
      typeof block === "number" ? toBlockHex(block) : block,
      false,
    ])
    return normalizeRpcBlock(
      result,
      typeof block === "number" ? block : undefined,
    )
  }

  async getLogs(
    filter: {
      address?: string
      fromBlock: number
      toBlock: number
      topics?: (string | string[] | null)[]
    },
    onProgress?: LogProgress,
  ): Promise<JsonRpcLog[]> {
    if (filter.fromBlock > filter.toBlock) return []
    const windows: { fromBlock: number; toBlock: number }[] = []
    const startBlock = filter.fromBlock
    const blockWindow = [9745, 9746].includes(this.chainId)
      ? PLASMA_LOG_BLOCK_WINDOW
      : DEFAULT_LOG_BLOCK_WINDOW
    for (
      let fromBlock = startBlock;
      fromBlock <= filter.toBlock;
      fromBlock += blockWindow
    ) {
      windows.push({
        fromBlock,
        toBlock: Math.min(filter.toBlock, fromBlock + blockWindow - 1),
      })
    }
    const results: JsonRpcLog[][] = Array(windows.length)
    let cursor = 0
    let completed = 0
    await Promise.all(
      Array.from(
        { length: Math.min(LOG_CONCURRENCY, windows.length) },
        async () => {
          while (cursor < windows.length) {
            const index = cursor
            cursor += 1
            results[index] = await this.getLogsWindow({
              ...filter,
              ...windows[index],
            })
            completed += 1
            await onProgress?.(completed, windows.length)
          }
        },
      ),
    )
    return results.flat()
  }

  private async getLogsWindow(filter: {
    address?: string
    fromBlock: number
    toBlock: number
    topics?: (string | string[] | null)[]
  }): Promise<JsonRpcLog[]> {
    const request = {
      ...(filter.address ? { address: filter.address } : {}),
      fromBlock: toBlockHex(filter.fromBlock),
      toBlock: toBlockHex(filter.toBlock),
      ...(filter.topics ? { topics: filter.topics } : {}),
    }
    try {
      const result = await this.call<unknown>("eth_getLogs", [request])
      if (!Array.isArray(result)) {
        throw new ExportRpcError(
          "eth_getLogs returned a non-array result",
          false,
        )
      }
      return result.map(normalizeRpcLog)
    } catch (error) {
      if (
        filter.fromBlock === filter.toBlock ||
        !(error instanceof ExportRpcError) ||
        error.category !== "range"
      ) {
        throw error
      }
      const middle = Math.floor((filter.fromBlock + filter.toBlock) / 2)
      const [left, right] = await Promise.all([
        this.getLogsWindow({ ...filter, toBlock: middle }),
        this.getLogsWindow({ ...filter, fromBlock: middle + 1 }),
      ])
      return [...left, ...right]
    }
  }

  async findDeploymentBlock(address: string, snapshotBlock: number) {
    const latestCode = await this.call<string>("eth_getCode", [
      address,
      toBlockHex(snapshotBlock),
    ])
    if (!hasCode(latestCode)) throw new Error(`No contract code at ${address}`)
    let low = -1
    let high = snapshotBlock
    while (high - low > 1) {
      const middle = Math.floor((high + low) / 2)
      const code = await this.call<string>("eth_getCode", [
        address,
        toBlockHex(middle),
      ])
      if (hasCode(code)) high = middle
      else low = middle
    }
    return high
  }

  async findBlockAtOrBefore(timestamp: number, highBlock: number) {
    let low = 0
    let high = highBlock
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      const block = await this.getBlock(middle)
      if (Number.parseInt(block.timestamp, 16) <= timestamp) low = middle
      else high = middle - 1
    }
    return low
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
      const blocks = await this.batch<unknown>(
        uniqueBlocks.map((block) => ({
          method: "eth_getBlockByNumber",
          params: [toBlockHex(block), false],
        })),
      )
      const timestampsByBlock = new Map(
        uniqueBlocks.map((block, index) => [
          block,
          fromHex(normalizeRpcBlock(blocks[index], block).timestamp),
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
}

export const toBlockHex = (block: number) => `0x${block.toString(16)}`
const assertHexQuantity = (value: string | undefined) => {
  if (!value || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value)) {
    throw new ExportRpcError(`Invalid RPC quantity: ${String(value)}`, false)
  }
  return value
}
export const fromHexBigInt = (value: string | undefined) =>
  BigInt(assertHexQuantity(value))
export const fromHex = (value: string | undefined) => {
  const result = fromHexBigInt(value)
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ExportRpcError(
      `RPC quantity exceeds safe integer: ${value}`,
      false,
    )
  }
  return Number(result)
}
export const hasCode = (value: string) =>
  value !== "0x" && !/^0x0*$/.test(value)
/* eslint-disable class-methods-use-this, max-classes-per-file, no-await-in-loop, no-plusplus, no-restricted-syntax, no-use-before-define */
