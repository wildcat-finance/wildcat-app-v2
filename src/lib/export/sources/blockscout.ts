/* eslint-disable no-await-in-loop, no-continue, no-restricted-syntax, max-classes-per-file */

import {
  EtherscanLog,
  ExportExplorer,
  normalizeEtherscanLog,
} from "./etherscan"
import { waitForProviderSlot } from "../jobs/providerThrottle"
import { ExportChainId } from "../types"

const BASE_URL = "https://api.blockscout.com/763373"
const RESULT_LIMIT = 1_000
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

class BlockscoutRangeError extends Error {}
export class BlockscoutRequestError extends Error {}

const quantity = (value: unknown): number => {
  if (typeof value !== "string" || !/^(0x[0-9a-f]+|[0-9]+)$/i.test(value)) {
    throw new Error("Invalid Blockscout quantity")
  }
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error("Invalid Blockscout quantity")
  return number
}

const fixedHex = (value: unknown, bytes: number): string => {
  if (
    typeof value !== "string" ||
    !new RegExp(`^0x[0-9a-f]{${bytes * 2}}$`, "i").test(value)
  ) {
    throw new Error("Invalid Blockscout hash or address")
  }
  return value.toLowerCase()
}

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Blockscout response object")
  return value as Record<string, unknown>
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

async function request(path: string): Promise<unknown> {
  const key = process.env.BLOCKSCOUT_API_KEY
  if (!key)
    throw new Error(
      "BLOCKSCOUT_API_KEY is required for Ink exports (Blockscout PRO API)",
    )
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set("apikey", key)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForProviderSlot("blockscout-pro", 1_000, 1)
    let response: Response
    try {
      response = await fetch(url.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      })
    } catch {
      if (attempt === 3)
        throw new BlockscoutRequestError("Blockscout request failed")
      await sleep(500 * 2 ** attempt)
      continue
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 3)
        throw new BlockscoutRequestError(`Blockscout HTTP ${response.status}`)
      const retryAfter = response.headers.get("retry-after")
      const seconds = retryAfter === null ? NaN : Number(retryAfter)
      const date = retryAfter === null ? NaN : Date.parse(retryAfter)
      const delay = Number.isFinite(seconds)
        ? seconds * 1_000
        : date - Date.now()
      await sleep(
        Math.max(500 * 2 ** attempt, Number.isFinite(delay) ? delay : 0),
      )
      continue
    }
    if (!response.ok)
      throw new Error(`Blockscout request rejected (status ${response.status})`)
    return response.json()
  }
  throw new BlockscoutRequestError("Blockscout request failed")
}

async function query(params: Record<string, string>): Promise<unknown[]> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const body = object(await request(`/api?${new URLSearchParams(params)}`))
    if (body.status === "1") {
      if (!Array.isArray(body.result))
        throw new Error("Invalid Blockscout result")
      return body.result
    }
    const message = `${body.message} ${
      typeof body.result === "string" ? body.result : ""
    }`
    if (
      body.status === "0" &&
      /no (logs|transactions|records) found/i.test(String(body.message)) &&
      ((Array.isArray(body.result) && body.result.length === 0) ||
        (typeof body.result === "string" &&
          /^(|no (logs|transactions|records) found)$/i.test(
            body.result.trim(),
          )))
    )
      return []
    if (/rate limit|max calls per sec/i.test(message)) {
      if (attempt === 3)
        throw new BlockscoutRequestError("Blockscout rate limit exceeded")
      await sleep(500 * 2 ** attempt)
      continue
    }
    if (
      /query timeout|result window|too many results|block range|limit exceeded/i.test(
        message,
      )
    )
      throw new BlockscoutRangeError("Blockscout range rejected")
    throw new Error("Blockscout request rejected")
  }
  throw new BlockscoutRequestError("Blockscout request failed")
}

const checkRange = (chainId: ExportChainId, from: number, to: number) => {
  if (chainId !== 763373)
    throw new Error("Blockscout adapter requires Ink Sepolia")
  if (![from, to].every((block) => Number.isSafeInteger(block) && block >= 0))
    throw new Error("Invalid Blockscout block range")
}

// A fresh instance keeps header caching local to one market export.
export function createBlockscoutExplorer(): ExportExplorer {
  const headers = new Map<number, Promise<string>>()
  const blockHash = (height: number) => {
    let pending = headers.get(height)
    if (!pending) {
      pending = request(`/api/v2/blocks/${height}`).then((value) => {
        const block = object(value)
        if (block.height !== height)
          throw new Error("Blockscout returned the wrong block")
        return fixedHex(block.hash, 32)
      })
      headers.set(height, pending)
    }
    return pending
  }

  const normalizeLog = async (value: unknown, from: number, to: number) => {
    const log = object(value)
    const height = quantity(log.blockNumber)
    if (height < from || height > to)
      throw new Error("Blockscout log outside requested range")
    if (!Array.isArray(log.topics) || log.topics.length > 4)
      throw new Error("Invalid Blockscout topics")
    const topics = [...log.topics]
    while (topics.at(-1) === null) topics.pop()
    topics.forEach((topic) => fixedHex(topic, 32))
    const hash = await blockHash(height)
    if (log.blockHash !== undefined && fixedHex(log.blockHash, 32) !== hash)
      throw new Error("Blockscout log block hash mismatch")
    return normalizeEtherscanLog({
      ...log,
      topics,
      blockHash: hash,
    } as EtherscanLog)
  }

  const logsInRange = async (
    from: number,
    to: number,
    filters: Record<string, string>,
  ): Promise<EtherscanLog[]> => {
    if (from > to) return []
    let rows: unknown[]
    try {
      // This endpoint ignores page/offset. Split saturated ranges, never page them.
      rows = await query({
        module: "logs",
        action: "getLogs",
        fromBlock: String(from),
        toBlock: String(to),
        ...filters,
      })
      if (rows.length >= RESULT_LIMIT)
        throw new BlockscoutRangeError("Blockscout log result cap reached")
    } catch (error) {
      if (!(error instanceof BlockscoutRangeError)) throw error
      if (from === to)
        throw new Error(`Blockscout log completeness unproven at block ${from}`)
      const middle = Math.floor((from + to) / 2)
      return [
        ...(await logsInRange(from, middle, filters)),
        ...(await logsInRange(middle + 1, to, filters)),
      ]
    }
    const logs: EtherscanLog[] = []
    for (const row of rows) logs.push(await normalizeLog(row, from, to))
    return logs
  }

  const uniqueLogs = (logs: EtherscanLog[], allowSelfTransfer = false) => {
    const unique = new Map<string, EtherscanLog>()
    for (const log of logs) {
      const key = `${log.transactionHash}:${log.logIndex}`
      const previous = unique.get(key)
      if (
        previous &&
        (!allowSelfTransfer || JSON.stringify(previous) !== JSON.stringify(log))
      )
        throw new Error("Blockscout returned duplicate or conflicting logs")
      unique.set(key, log)
    }
    return [...unique.values()].sort(
      (a, b) =>
        quantity(a.blockNumber) - quantity(b.blockNumber) ||
        quantity(a.logIndex) - quantity(b.logIndex),
    )
  }

  return {
    async getMarketLogs(chainId, market, from, to) {
      checkRange(chainId, from, to)
      const address = fixedHex(market, 20)
      const logs = uniqueLogs(await logsInRange(from, to, { address }))
      if (logs.some((log) => log.address !== address))
        throw new Error("Blockscout returned an unrelated market log")
      return logs
    },
    async getTransferLogsMentioningAddress(chainId, address, from, to) {
      checkRange(chainId, from, to)
      const topic = `0x${fixedHex(address, 20).slice(2).padStart(64, "0")}`
      const outgoing = uniqueLogs(
        await logsInRange(from, to, {
          topic0: TRANSFER_TOPIC,
          topic1: topic,
          topic0_1_opr: "and",
        }),
      )
      const incoming = uniqueLogs(
        await logsInRange(from, to, {
          topic0: TRANSFER_TOPIC,
          topic2: topic,
          topic0_2_opr: "and",
        }),
      )
      const logs = uniqueLogs([...outgoing, ...incoming], true)
      if (
        logs.some(
          (log) =>
            log.topics.length !== 3 ||
            log.topics[0] !== TRANSFER_TOPIC ||
            (log.topics[1] !== topic && log.topics[2] !== topic),
        )
      )
        throw new Error("Blockscout returned an unrelated transfer candidate")
      return logs
    },
    async getDirectFailedTransactionHashes(chainId, market, from, to) {
      checkRange(chainId, from, to)
      const address = fixedHex(market, 20)
      const transactions = async (
        start: number,
        end: number,
      ): Promise<string[]> => {
        if (start > end) return []
        const hashes = new Set<string>()
        const failed: string[] = []
        for (let page = 1; ; page += 1) {
          if (page > 10_000)
            throw new Error(
              "Blockscout transaction pagination completeness limit exceeded",
            )
          let rows: unknown[]
          try {
            rows = await query({
              module: "account",
              action: "txlist",
              address,
              startblock: String(start),
              endblock: String(end),
              sort: "asc",
              page: String(page),
              offset: String(RESULT_LIMIT),
            })
          } catch (error) {
            if (!(error instanceof BlockscoutRangeError) || start === end)
              throw error
            const middle = Math.floor((start + end) / 2)
            return [
              ...(await transactions(start, middle)),
              ...(await transactions(middle + 1, end)),
            ]
          }
          for (const value of rows) {
            const row = object(value)
            const hash = fixedHex(row.hash, 32)
            const height = quantity(row.blockNumber)
            if (
              height < start ||
              height > end ||
              (row.isError !== "0" && row.isError !== "1")
            )
              throw new Error("Invalid Blockscout transaction")
            if (typeof row.to !== "string")
              throw new Error("Invalid Blockscout transaction recipient")
            const recipient = row.to === "" ? "" : fixedHex(row.to, 20)
            if (hashes.has(hash))
              throw new Error(
                "Blockscout repeated a transaction; completeness is unproven",
              )
            hashes.add(hash)
            if (recipient === address && row.isError === "1") failed.push(hash)
          }
          if (rows.length < RESULT_LIMIT) return failed
        }
      }
      return transactions(from, to)
    },
  }
}
