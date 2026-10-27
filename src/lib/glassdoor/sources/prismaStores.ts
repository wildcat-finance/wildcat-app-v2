/* eslint-disable no-await-in-loop, no-restricted-syntax */
// Compaction merges one run at a time on purpose: each run is its own short
// transaction, and only one run's logs are held in memory.

import { gunzipSync, gzipSync } from "node:zlib"

import type { PrismaClient } from "@prisma/client"

import {
  addressSetKey,
  contiguousRuns,
  ScanFilter,
  ScanRange,
  ScanRangeStore,
} from "./chainScan"
import { ChainDay, ChainDayStore } from "./dayEndBlocks"
import { JsonRpcLog } from "../../export/types"

const toDate = (day: string) => new Date(`${day}T00:00:00Z`)
const fromDate = (date: Date) => date.toISOString().slice(0, 10)
const decodeLogs = (logs: Uint8Array) =>
  JSON.parse(gunzipSync(logs).toString("utf8")) as JsonRpcLog[]

export const prismaScanRangeStore = (
  database: PrismaClient,
): ScanRangeStore => ({
  async covering(chainId, filter, addresses, fromBlock, toBlock) {
    const rows = await database.glassDoorScanRange.findMany({
      where: {
        chainId,
        filter,
        addresses: {
          hasEvery: addresses.map((address) => address.toLowerCase()),
        },
        fromBlock: { lte: BigInt(toBlock) },
        toBlock: { gte: BigInt(fromBlock) },
      },
      orderBy: { fromBlock: "asc" },
    })
    return rows.map((row) => ({
      chainId: row.chainId,
      filter: row.filter as ScanFilter,
      fromBlock: Number(row.fromBlock),
      toBlock: Number(row.toBlock),
      toBlockHash: row.toBlockHash,
      addressSet: row.addressSet,
      addresses: row.addresses,
      logs: decodeLogs(row.logs),
    }))
  },
  async save(range: ScanRange) {
    const addressSet = range.addressSet || addressSetKey(range.addresses)
    await database.glassDoorScanRange.upsert({
      where: {
        chainId_filter_addressSet_fromBlock: {
          chainId: range.chainId,
          filter: range.filter,
          addressSet,
          fromBlock: BigInt(range.fromBlock),
        },
      },
      create: {
        chainId: range.chainId,
        filter: range.filter,
        fromBlock: BigInt(range.fromBlock),
        toBlock: BigInt(range.toBlock),
        toBlockHash: range.toBlockHash,
        addressSet,
        addresses: range.addresses,
        logCount: range.logs.length,
        logs: gzipSync(Buffer.from(JSON.stringify(range.logs))),
      },
      update: {},
    })
  },
})

/** A chain's committed ranges without their logs, for coverage checks. */
export async function committedRanges(database: PrismaClient, chainId: number) {
  const rows = await database.glassDoorScanRange.findMany({
    where: { chainId },
    select: { filter: true, fromBlock: true, toBlock: true, addresses: true },
  })
  return rows.map((row) => ({
    filter: row.filter as ScanFilter,
    fromBlock: Number(row.fromBlock),
    toBlock: Number(row.toBlock),
    addresses: row.addresses,
  }))
}

const MERGED_RANGE_MAX_LOGS = 5_000

/**
 * Merges the contiguous ranges committed on each earlier UTC day, per chain,
 * filter and address set, into one row, so five-minute scans add a few rows a
 * day instead of hundreds. A merged row keeps every log of its parts, so it
 * serves resumes and later rebuilds exactly as they did. Returns the number
 * of rows removed.
 */
export async function compactScanRanges(
  database: PrismaClient,
  before = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`),
) {
  const rows = await database.glassDoorScanRange.findMany({
    where: { createdAt: { lt: before } },
    select: {
      id: true,
      chainId: true,
      filter: true,
      addressSet: true,
      fromBlock: true,
      toBlock: true,
      toBlockHash: true,
      logCount: true,
      createdAt: true,
    },
  })
  const groups = new Map<string, typeof rows>()
  rows.forEach((row) => {
    const key = [
      row.chainId,
      row.filter,
      row.addressSet,
      fromDate(row.createdAt),
    ].join(":")
    groups.set(key, [...(groups.get(key) ?? []), row])
  })
  let removed = 0
  for (const group of groups.values()) {
    const runs = contiguousRuns(
      group.map((row) => ({
        ...row,
        fromBlock: Number(row.fromBlock),
        toBlock: Number(row.toBlock),
      })),
      MERGED_RANGE_MAX_LOGS,
    )
    for (const run of runs) {
      const parts = await database.glassDoorScanRange.findMany({
        where: { id: { in: run.map((range) => range.id) } },
        select: { id: true, logs: true },
      })
      const logsById = new Map(
        parts.map((part) => [part.id, decodeLogs(part.logs)]),
      )
      const logs = run.flatMap((range) => logsById.get(range.id)!)
      const [first, ...rest] = run
      const last = run[run.length - 1]
      await database.$transaction([
        database.glassDoorScanRange.update({
          where: { id: first.id },
          data: {
            toBlock: BigInt(last.toBlock),
            toBlockHash: last.toBlockHash,
            logCount: logs.length,
            logs: gzipSync(Buffer.from(JSON.stringify(logs))),
          },
        }),
        database.glassDoorScanRange.deleteMany({
          where: { id: { in: rest.map((range) => range.id) } },
        }),
      ])
      removed += rest.length
    }
  }
  return removed
}

export const prismaChainDayStore = (database: PrismaClient): ChainDayStore => ({
  async get(chainId, days) {
    if (days.length === 0) return []
    const rows = await database.glassDoorChainDay.findMany({
      where: { chainId, day: { in: days.map(toDate) } },
    })
    return rows.map(
      (row): ChainDay => ({
        chainId: row.chainId,
        day: fromDate(row.day),
        lastBlock: Number(row.lastBlock),
        blockHash: row.blockHash,
        blockTimestamp: row.blockTimestamp,
      }),
    )
  },
  async save(rows) {
    if (rows.length === 0) return
    await database.glassDoorChainDay.createMany({
      data: rows.map((row) => ({
        chainId: row.chainId,
        day: toDate(row.day),
        lastBlock: BigInt(row.lastBlock),
        blockHash: row.blockHash,
        blockTimestamp: row.blockTimestamp,
      })),
      skipDuplicates: true,
    })
  },
})
