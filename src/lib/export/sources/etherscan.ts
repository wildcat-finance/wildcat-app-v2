/* eslint-disable no-await-in-loop, no-continue */

import { getEtherscanApiKey } from "../config"
import { waitForProviderSlot } from "../jobs/providerThrottle"
import { ExportChainId } from "../types"

type EtherscanResponse<T> = {
  status: string
  message: string
  result: T | string
}

export type EtherscanTransaction = {
  blockNumber: string
  timeStamp: string
  hash: string
  nonce: string
  blockHash: string
  transactionIndex: string
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  isError: string
  txreceipt_status: string
  input: string
  methodId: string
  functionName: string
}

export type EtherscanLog = {
  address: string
  blockHash: string
  topics: string[]
  data: string
  blockNumber: string
  timeStamp: string
  gasPrice: string
  gasUsed: string
  logIndex: string
  transactionHash: string
  transactionIndex: string
}

export type ExportExplorer = {
  getDirectFailedTransactionHashes(
    chainId: ExportChainId,
    market: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<string[]>
  getMarketLogs(
    chainId: ExportChainId,
    market: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<EtherscanLog[]>
}

const parseEtherscanQuantity = (value: string, field: string) => {
  if (typeof value !== "string") {
    throw new Error(`Invalid Etherscan ${field}: expected a string`)
  }
  const normalized = value.toLowerCase() === "0x" ? "0x0" : value
  if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(normalized)) {
    throw new Error(`Invalid Etherscan ${field}: ${value}`)
  }
  const result = normalized.startsWith("0x")
    ? Number.parseInt(normalized, 16)
    : Number.parseInt(normalized, 10)
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`Invalid Etherscan ${field}: ${value}`)
  }
  return result
}

const normalizeFixedHex = (value: string, bytes: number, field: string) => {
  if (!new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`, "i").test(value)) {
    throw new Error(`Invalid Etherscan ${field}: ${value}`)
  }
  return value.toLowerCase()
}

const normalizeData = (value: string, field: string) => {
  if (!/^0x(?:[0-9a-f]{2})*$/i.test(value)) {
    throw new Error(`Invalid Etherscan ${field}: ${value}`)
  }
  return value.toLowerCase()
}

export const normalizeEtherscanLog = (log: EtherscanLog): EtherscanLog => ({
  ...log,
  address: normalizeFixedHex(log.address, 20, "address"),
  blockHash: normalizeFixedHex(log.blockHash, 32, "blockHash"),
  transactionHash: normalizeFixedHex(
    log.transactionHash,
    32,
    "transactionHash",
  ),
  topics: log.topics.map((topic, index) =>
    normalizeFixedHex(topic, 32, `topics[${index}]`),
  ),
  data: normalizeData(log.data, "data"),
  blockNumber: `0x${parseEtherscanQuantity(
    log.blockNumber,
    "blockNumber",
  ).toString(16)}`,
  logIndex: `0x${parseEtherscanQuantity(log.logIndex, "logIndex").toString(
    16,
  )}`,
  transactionIndex: `0x${parseEtherscanQuantity(
    log.transactionIndex,
    "transactionIndex",
  ).toString(16)}`,
})

const PAGE_SIZE = 1_000
const MIN_REQUEST_INTERVAL_MS = 350
class EtherscanRangeError extends Error {}

const retryDelay = (attempt: number, retryAfter: string | null) => {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN
  const base = Number.isFinite(seconds) ? seconds * 1_000 : 500 * 2 ** attempt
  return base + Math.floor(Math.random() * 250)
}

async function query<T>(params: URLSearchParams): Promise<T> {
  params.set("apikey", getEtherscanApiKey())
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForProviderSlot("etherscan-v2", MIN_REQUEST_INTERVAL_MS)
    const response = await fetch(`https://api.etherscan.io/v2/api?${params}`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 3) {
        await new Promise((resolve) => {
          setTimeout(
            resolve,
            retryDelay(attempt, response.headers.get("retry-after")),
          )
        })
        continue
      }
      throw new Error(`Etherscan HTTP ${response.status}`)
    }
    if (!response.ok) throw new Error(`Etherscan HTTP ${response.status}`)
    const body = (await response.json()) as EtherscanResponse<T>
    if (!body || typeof body !== "object") {
      throw new Error("Invalid Etherscan response envelope")
    }
    if (body.status === "1") {
      if (!Array.isArray(body.result)) {
        throw new Error("Invalid Etherscan result: expected an array")
      }
      return body.result as T
    }
    if (
      body.status === "0" &&
      typeof body.result === "string" &&
      /no transactions found|no records found/i.test(body.result)
    ) {
      return [] as T
    }
    if (/rate limit|max calls per sec/i.test(String(body.result))) {
      if (attempt < 3) {
        await new Promise((resolve) => {
          setTimeout(resolve, retryDelay(attempt, null))
        })
        continue
      }
    }
    if (
      /query timeout|result window|too many results|block range|limit exceeded/i.test(
        `${body.message} ${String(body.result)}`,
      )
    ) {
      throw new EtherscanRangeError(
        `Etherscan range rejected: ${body.message} ${String(body.result)}`,
      )
    }
    throw new Error(
      `Etherscan request failed: ${body.message} ${String(body.result)}`,
    )
  }
  throw new Error("Etherscan request failed after retries")
}

export async function getDirectFailedTransactionHashes(
  chainId: ExportChainId,
  market: string,
  fromBlock: number,
  toBlock: number,
) {
  const fetchWindow = async (
    windowStart: number,
    windowEnd: number,
  ): Promise<EtherscanTransaction[]> => {
    const fetchPage = (page: number) =>
      query<EtherscanTransaction[]>(
        new URLSearchParams({
          chainid: String(chainId),
          module: "account",
          action: "txlist",
          address: market,
          startblock: String(windowStart),
          endblock: String(windowEnd),
          page: String(page),
          offset: String(PAGE_SIZE),
          sort: "asc",
        }),
      )
    let first: EtherscanTransaction[]
    try {
      first = await fetchPage(1)
    } catch (error) {
      if (!(error instanceof EtherscanRangeError) || windowStart === windowEnd)
        throw error
      const middle = Math.floor((windowStart + windowEnd) / 2)
      const left = await fetchWindow(windowStart, middle)
      const right = await fetchWindow(middle + 1, windowEnd)
      return [...left, ...right]
    }
    if (first.length < PAGE_SIZE) return first
    if (windowStart < windowEnd) {
      const middle = Math.floor((windowStart + windowEnd) / 2)
      const [left, right] = await Promise.all([
        fetchWindow(windowStart, middle),
        fetchWindow(middle + 1, windowEnd),
      ])
      return [...left, ...right]
    }
    const result = [...first]
    const hashes = new Set(first.map((row) => row.hash.toLowerCase()))
    for (let page = 2; ; page += 1) {
      if (page > 10_000) {
        throw new Error(
          "Etherscan transaction pagination completeness limit exceeded",
        )
      }
      const rows = await fetchPage(page)
      const before = hashes.size
      rows.forEach((row) => hashes.add(row.hash.toLowerCase()))
      if (rows.length === PAGE_SIZE && hashes.size === before) {
        throw new Error(
          "Etherscan repeated a full transaction page; completeness is unproven",
        )
      }
      result.push(...rows)
      if (rows.length < PAGE_SIZE) break
    }
    return result
  }

  const rows = await fetchWindow(fromBlock, toBlock)
  const failed = rows
    .filter(
      (row) =>
        row.to?.toLowerCase() === market.toLowerCase() && row.isError === "1",
    )
    .map((row) => normalizeFixedHex(row.hash, 32, "transaction hash"))
  if (new Set(failed).size !== failed.length) {
    throw new Error("Etherscan returned duplicate failed transactions")
  }
  return failed
}

const numeric = (value: string) => parseEtherscanQuantity(value, "quantity")

async function getLogsWindow(
  chainId: ExportChainId,
  market: string,
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const fetchPage = async (page: number) =>
    (
      await query<EtherscanLog[]>(
        new URLSearchParams({
          chainid: String(chainId),
          module: "logs",
          action: "getLogs",
          address: market,
          fromBlock: String(fromBlock),
          toBlock: String(toBlock),
          page: String(page),
          offset: String(PAGE_SIZE),
        }),
      )
    ).map(normalizeEtherscanLog)
  let first: EtherscanLog[]
  try {
    first = await fetchPage(1)
  } catch (error) {
    if (!(error instanceof EtherscanRangeError) || fromBlock === toBlock)
      throw error
    const middle = Math.floor((fromBlock + toBlock) / 2)
    const left = await getLogsWindow(chainId, market, fromBlock, middle)
    const right = await getLogsWindow(chainId, market, middle + 1, toBlock)
    return [...left, ...right]
  }
  if (first.length < PAGE_SIZE) return first
  if (fromBlock < toBlock) {
    const middle = Math.floor((fromBlock + toBlock) / 2)
    const [left, right] = await Promise.all([
      getLogsWindow(chainId, market, fromBlock, middle),
      getLogsWindow(chainId, market, middle + 1, toBlock),
    ])
    return [...left, ...right]
  }

  const result = [...first]
  const identities = new Set(
    first.map(
      (row) => `${row.transactionHash.toLowerCase()}:${numeric(row.logIndex)}`,
    ),
  )
  for (let page = 2; ; page += 1) {
    if (page > 10_000) {
      throw new Error("Etherscan log pagination completeness limit exceeded")
    }
    const rows = await fetchPage(page)
    const before = identities.size
    rows.forEach((row) =>
      identities.add(
        `${row.transactionHash.toLowerCase()}:${numeric(row.logIndex)}`,
      ),
    )
    if (rows.length === PAGE_SIZE && identities.size === before) {
      throw new Error(
        "Etherscan repeated a full log page; completeness is unproven",
      )
    }
    result.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return result
}

export async function getEtherscanMarketLogs(
  chainId: ExportChainId,
  market: string,
  fromBlock: number,
  toBlock: number,
) {
  const logs = await getLogsWindow(chainId, market, fromBlock, toBlock)
  const deduped = new Map<string, EtherscanLog>()
  logs.forEach((log) => {
    const identity = `${log.transactionHash.toLowerCase()}:${numeric(
      log.logIndex,
    )}`
    if (deduped.has(identity)) {
      throw new Error(`Etherscan returned duplicate log ${identity}`)
    }
    deduped.set(identity, log)
  })
  return [...deduped.values()].sort(
    (left, right) =>
      numeric(left.blockNumber) - numeric(right.blockNumber) ||
      numeric(left.logIndex) - numeric(right.logIndex),
  )
}

export const etherscanExplorer: ExportExplorer = {
  getDirectFailedTransactionHashes,
  getMarketLogs: getEtherscanMarketLogs,
}
/* eslint-disable no-await-in-loop */
