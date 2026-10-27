/* eslint-disable no-await-in-loop, no-restricted-syntax */
import {
  GlassDoorMarketState,
  GlassDoorMarketStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client"

import { AUDIT_REASON_PREFIX, isAuditFlag } from "./audit"
import {
  borrowerComparisons,
  marketComparisons,
  protocolCounts,
} from "./comparisons"
import {
  isCurrentDatasetKey,
  loadAnalyticsDataset,
  pruneAnalyticsDatasets,
  saveAnalyticsDataset,
} from "./datasets"
import { borrowerGateProblems, coverageGaps, marketGateProblems } from "./gates"
import {
  CutBlock,
  readClosure,
  readMinimumDeposits,
  readStatesAtCut,
} from "./project"
import { discoverV2Markets, registryContracts } from "./universe"
import { buildMarketDataset } from "../../export/ledger/buildMarketDataset"
import { orderedMarketMetadata } from "../../export/sources/discovery"
import { ExportRpcClient, fromHex } from "../../export/sources/rpc"
import { ExportChainId, MarketMetadata } from "../../export/types"
import {
  borrowerMetricsFrom,
  MarketSummary,
  marketMetricsAt,
  MetricResults,
  stateAtDataset,
  summarizeMarket,
  SUMMARY_VERSION,
} from "../datasetMetrics"
import { ChainScanResult, logsForMarket, scanChain } from "../sources/chainScan"
import { dayEndBlocks, sharedDayEndLookup } from "../sources/dayEndBlocks"
import {
  committedRanges,
  prismaChainDayStore,
  prismaScanRangeStore,
} from "../sources/prismaStores"

// One update run: fix a finalized block per chain, scan new logs, rebuild the
// markets that changed, carry quiet markets forward, then stage every metric
// under a new publication and make it current in one transaction.
//
// When the last publication is from an earlier UTC day, the run is cut at
// that day's last block instead and recorded as the day's DayClose. The next
// run continues from there, so every day gets one exact day-end record.

export const GLASS_DOOR_CHAINS: ExportChainId[] = [1, 9745]
export const GLASS_DOOR_REGISTRY_VERSION = "cheat-sheet-v4"
const PUBLISH_LOCK = 9_080_808n
const BUILD_CONCURRENCY = 3
const PRUNE_AFTER_MS = 6 * 60 * 60 * 1_000
// A run must fit one Workflow step (the plan's maximum function duration, 800 s
// on Pro). New markets cost a deployment-block search and a first build each,
// and a first build of the largest market takes about 7 minutes. So a run
// admits a few new markets and starts first builds only in its first two
// minutes; the rest stay Preparing for later runs. Markets that already have a
// dataset are always rebuilt when touched.
const NEW_MARKETS_PER_RUN = 10
const FIRST_BUILD_BUDGET_MS = 2 * 60 * 1_000

export type GlassDoorUpdateOptions = {
  database: PrismaClient
  chainIds?: ExportChainId[]
  concurrency?: number
  /** Infinity for a backfill run outside a function time limit. */
  newMarketsPerRun?: number
  /** From the run's start; Infinity for a backfill outside a function limit. */
  firstBuildBudgetMs?: number
  log?: (message: string) => void
}

type RunLimits = { newMarkets: number; firstBuildDeadline: number }

type ChainCut = CutBlock & { dayClose?: string }

type MarketOutcome = {
  market: MarketMetadata
  summary?: MarketSummary
  metrics?: MetricResults
  state: GlassDoorMarketState
  reason?: string
  rebuilt: boolean
}

const isoDay = (timestamp: number) =>
  new Date(timestamp * 1_000).toISOString().slice(0, 10)

const finite = (metrics: MetricResults) =>
  Object.fromEntries(
    Object.entries(metrics).map(([id, value]) => [
      id,
      typeof value === "number" && !Number.isFinite(value) ? null : value,
    ]),
  )

async function eachLimited<T>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<void>,
) {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next]
        next += 1
        await run(item)
      }
    }),
  )
}

const nextDay = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10)

/**
 * The UTC day a run closes, if any. Once the last publication's day has its
 * record, the next day is closed, so after an outage each run records one
 * missed day until the cut reaches the latest finalized day.
 */
export const dayToClose = (
  lastDay: string,
  latestDay: string,
  lastDayClosed: boolean,
) => {
  const day = lastDayClosed ? nextDay(lastDay) : lastDay
  return day < latestDay ? day : undefined
}

async function chooseCut(
  database: PrismaClient,
  rpc: ExportRpcClient,
  chainId: ExportChainId,
  lastCut: { timestamp: number } | undefined,
): Promise<ChainCut> {
  const finalized = await rpc.getBlock("finalized")
  const latest: ChainCut = {
    number: fromHex(finalized.number),
    hash: finalized.hash.toLowerCase(),
    timestamp: fromHex(finalized.timestamp),
  }
  if (!lastCut) return latest
  const lastDay = isoDay(lastCut.timestamp)
  const latestDay = isoDay(latest.timestamp)
  if (latestDay <= lastDay) return latest
  const recorded = await database.glassDoorPublication.findFirst({
    where: { kind: "DayClose", day: new Date(`${lastDay}T00:00:00Z`) },
    select: { id: true },
  })
  const day = dayToClose(lastDay, latestDay, Boolean(recorded))
  if (!day) return latest
  const row = (
    await dayEndBlocks(
      rpc,
      prismaChainDayStore(database),
      chainId,
      [day],
      latest.number,
    )
  ).get(day)
  if (!row) return latest
  return {
    number: row.lastBlock,
    hash: row.blockHash,
    timestamp: row.blockTimestamp,
    dayClose: day,
  }
}

async function updateChain(
  database: PrismaClient,
  chainId: ExportChainId,
  rpc: ExportRpcClient,
  cut: ChainCut,
  concurrency: number,
  limits: RunLimits,
  log: (message: string) => void,
): Promise<MarketOutcome[]> {
  const scanStore = prismaScanRangeStore(database)
  const dayStore = prismaChainDayStore(database)
  const seconds = (since: number) => Math.round((Date.now() - since) / 1_000)
  const chainStarted = Date.now()
  const known = await database.glassDoorMarketStatus.findMany({
    where: { chainId },
  })
  // Metadata never changes after deployment, so markets with a summary are
  // not read again; only new markets and older summaries without it are.
  const stored = new Map<string, MarketMetadata>()
  known.forEach((row) => {
    const market = (row.tailState as unknown as MarketSummary | null)?.market
    if (market) stored.set(row.address, orderedMarketMetadata(market))
  })
  const { markets: discovered, deferred } = await discoverV2Markets(
    rpc,
    chainId,
    cut.number,
    {
      known: new Map(
        known.map((row) => [row.address, Number(row.deploymentBlock)] as const),
      ),
      stored: new Set(stored.keys()),
      maxNew: limits.newMarkets,
    },
  )
  const markets = [...stored.values(), ...discovered].sort((a, b) =>
    a.address < b.address ? -1 : 1,
  )
  const status = new Map<string, GlassDoorMarketStatus>(
    known.map((row) => [row.address, row]),
  )
  await Promise.all(
    discovered
      .filter((market) => status.get(market.address)?.tailState)
      .map((market) =>
        database.glassDoorMarketStatus.update({
          where: { chainId_address: { chainId, address: market.address } },
          data: {
            tailState: {
              ...(status.get(market.address)!.tailState as Prisma.JsonObject),
              market,
            } as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
  )
  const unseen = markets.filter((market) => !status.has(market.address))
  if (unseen.length > 0) {
    await database.glassDoorMarketStatus.createMany({
      data: unseen.map((market) => ({
        chainId,
        address: market.address,
        borrower: market.borrower.toLowerCase(),
        deploymentBlock: BigInt(market.deploymentBlock),
      })),
      skipDuplicates: true,
    })
    const created = await database.glassDoorMarketStatus.findMany({
      where: {
        chainId,
        address: { in: unseen.map((market) => market.address) },
      },
    })
    created.forEach((row) => status.set(row.address, row))
    log(`chain ${chainId}: ${unseen.length} new markets`)
  }
  if (deferred > 0) {
    log(`chain ${chainId}: ${deferred} more new markets left for later runs`)
  }
  const discoveredAt = Date.now()
  const found = `${markets.length} markets found in ${seconds(chainStarted)}s`
  const registries = registryContracts(chainId)
  const checkedThrough = (market: MarketMetadata) =>
    Number(
      status.get(market.address)?.checkedThroughBlock ??
        BigInt(market.deploymentBlock - 1),
    )
  const established = markets.filter(
    (market) => status.get(market.address)?.datasetKey,
  )
  // A dataset from an earlier pipeline version can't be a checkpoint, so its
  // market is rebuilt from scratch like a new one, and carried forward on its
  // last summary until then.
  const hasCurrentDataset = (market: MarketMetadata) => {
    const key = status.get(market.address)?.datasetKey
    return Boolean(key && isCurrentDatasetKey(key))
  }
  const preparing = markets.filter((market) => !hasCurrentDataset(market))

  // Routine scan for markets with a dataset; market logs only for backfill.
  let routine: ChainScanResult | undefined
  if (established.length > 0) {
    const from = Math.min(...established.map(checkedThrough)) + 1
    if (from <= cut.number) {
      routine = await scanChain(
        rpc,
        scanStore,
        {
          chainId,
          markets: established.map((market) => market.address),
          registries,
          assets: established.map((market) => market.assetAddress),
        },
        from,
        cut.number,
      )
    }
  }
  let backfill: ChainScanResult | undefined
  if (preparing.length > 0) {
    backfill = await scanChain(
      rpc,
      scanStore,
      {
        chainId,
        markets: preparing.map((market) => market.address),
        registries,
        assets: [],
      },
      Math.min(...preparing.map((market) => market.deploymentBlock)),
      cut.number,
      { filters: ["MarketLogs"] },
    )
    log(`chain ${chainId}: backfill scan done for ${preparing.length} markets`)
  }

  const touched = established.filter((market) => {
    if (!hasCurrentDataset(market)) return false
    const row = status.get(market.address)!
    // Retry failed builds every run; an audit flag waits for new activity.
    if (row.state === "UnderReview" && !isAuditFlag(row)) return true
    if (!routine) return false
    const { marketLogs, assetTransfers } = logsForMarket(
      routine,
      market.address,
      market.assetAddress,
    )
    return [...marketLogs, ...assetTransfers].some(
      (entry) => fromHex(entry.blockNumber) > checkedThrough(market),
    )
  })
  const scanned = `scanned in ${seconds(discoveredAt)}s`
  log(
    `chain ${chainId}: ${found}, ${scanned}; rebuilding ${touched.length} with new activity and ${preparing.length} without a current dataset`,
  )
  const rebuildList = [...touched, ...preparing]
  const outcomes = new Map<string, MarketOutcome>()
  const findBlocksAtOrBefore = sharedDayEndLookup(rpc, dayStore, chainId)
  let postponed = 0

  // A summary from earlier formulas is recomputed from the stored dataset,
  // keeping its closure check and the day-close cash checks recorded since.
  const outdatedSummaries = markets.filter((market) => {
    const summary = status.get(market.address)
      ?.tailState as unknown as MarketSummary | null
    return (
      hasCurrentDataset(market) &&
      !touched.includes(market) &&
      Boolean(summary) &&
      summary!.version !== SUMMARY_VERSION
    )
  })
  await eachLimited(outdatedSummaries, concurrency, async (market) => {
    const row = status.get(market.address)!
    const previous = row.tailState as unknown as MarketSummary
    try {
      const dataset = await loadAnalyticsDataset(row.datasetKey!)
      const summary: MarketSummary = {
        ...summarizeMarket(dataset),
        closure: previous.closure,
      }
      summary.tailDayEnds = [
        ...(summary.tailDayEnds ?? []),
        ...(previous.tailDayEnds ?? []).filter(
          (check) => check.timestamp > dataset.snapshotTimestamp,
        ),
      ]
      await database.glassDoorMarketStatus.update({
        where: { chainId_address: { chainId, address: market.address } },
        data: { tailState: summary as unknown as Prisma.InputJsonValue },
      })
      status.set(market.address, {
        ...row,
        tailState: summary as unknown as Prisma.JsonValue,
      })
    } catch (error) {
      log(
        `chain ${chainId}: ${market.symbol} summary not recomputed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  })
  if (outdatedSummaries.length > 0) {
    log(
      `chain ${chainId}: recomputed ${outdatedSummaries.length} summaries from their datasets`,
    )
  }
  // Minimum deposit (D03) comes from each market's hooks instance.
  const minimumDeposits = await readMinimumDeposits(rpc, markets, cut).catch(
    (error) => {
      log(
        `chain ${chainId}: minimum deposits not read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return new Map<string, string>()
    },
  )

  await eachLimited(rebuildList, concurrency, async (market) => {
    const row = status.get(market.address)!
    if (!hasCurrentDataset(market) && Date.now() > limits.firstBuildDeadline) {
      postponed += 1
      return
    }
    const started = Date.now()
    try {
      const checkpoint = hasCurrentDataset(market)
        ? await loadAnalyticsDataset(row.datasetKey!)
        : undefined
      const scan = checkpoint ? routine : backfill
      const dataset = await buildMarketDataset(
        rpc,
        market,
        cut.number,
        cut.hash,
        cut.timestamp,
        [],
        undefined,
        undefined,
        checkpoint,
        {
          marketLogs: scan
            ? logsForMarket(scan, market.address, market.assetAddress)
                .marketLogs
            : [],
          findBlocksAtOrBefore,
        },
      )
      const key = await saveAnalyticsDataset(dataset)
      const summary = summarizeMarket(dataset)
      const previous = row.tailState as unknown as MarketSummary | null
      if (previous?.closure && previous.closure.block === summary.closedBlock) {
        summary.closure = previous.closure
      }
      const { holderBalancesMatchSupply, withdrawalBatchesMatchState } =
        dataset.manifest.crossChecks
      const ok = holderBalancesMatchSupply && withdrawalBatchesMatchState
      // Only a later audit clears an audit flag.
      const auditReason = isAuditFlag(row) ? row.stateReason! : undefined
      const reason = ok
        ? auditReason
        : "Holder balances or withdrawal batches do not match chain state"
      await database.glassDoorMarketStatus.update({
        where: { chainId_address: { chainId, address: market.address } },
        data: {
          datasetKey: key,
          lastRebuiltBlock: BigInt(cut.number),
          lastEventBlock: BigInt(
            Math.max(0, ...dataset.events.map((event) => event.blockNumber)),
          ),
          checkedThroughBlock: BigInt(cut.number),
          tailState: summary as unknown as Prisma.InputJsonValue,
          state: reason ? "UnderReview" : "Ok",
          stateReason: reason ?? null,
        },
      })
      await pruneAnalyticsDatasets(key).catch((error) =>
        log(
          `chain ${chainId}: ${market.symbol} dataset cleanup failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      )
      outcomes.set(market.address, {
        market,
        summary,
        metrics: marketMetricsAt(summary, {
          ...stateAtDataset(dataset),
          minimumDepositRaw: minimumDeposits.get(market.address),
        }),
        state: reason ? "UnderReview" : "Ok",
        reason,
        rebuilt: true,
      })
      log(
        `chain ${chainId}: rebuilt ${market.symbol} (${
          dataset.events.length
        } events) in ${Math.round((Date.now() - started) / 1000)}s`,
      )
    } catch (error) {
      const reason = (
        error instanceof Error ? error.message : String(error)
      ).slice(0, 500)
      const state: GlassDoorMarketState = row.datasetKey
        ? "UnderReview"
        : "Preparing"
      await database.glassDoorMarketStatus.update({
        where: { chainId_address: { chainId, address: market.address } },
        data: { state, stateReason: reason },
      })
      outcomes.set(market.address, {
        market,
        summary: (row.tailState as unknown as MarketSummary) ?? undefined,
        state,
        reason,
        rebuilt: false,
      })
      log(`chain ${chainId}: ${market.symbol} failed: ${reason}`)
    }
  })

  if (postponed > 0) {
    log(`chain ${chainId}: ${postponed} first builds left for later runs`)
  }

  // Carry every market not rebuilt this run forward to the cut.
  const forward = markets.filter((market) => {
    const outcome = outcomes.get(market.address)
    const summary =
      outcome?.summary ??
      (status.get(market.address)?.tailState as unknown as MarketSummary)
    return !outcome?.rebuilt && summary
  })
  const states = await readStatesAtCut(rpc, forward, cut)
  forward.forEach((market, index) => {
    const outcome = outcomes.get(market.address)
    const summary = (outcome?.summary ??
      status.get(market.address)!.tailState) as unknown as MarketSummary
    outcomes.set(market.address, {
      market,
      summary,
      metrics: marketMetricsAt(summary, {
        ...states[index],
        minimumDepositRaw: minimumDeposits.get(market.address),
      }),
      state: outcome?.state ?? status.get(market.address)!.state,
      reason:
        outcome?.reason ?? status.get(market.address)!.stateReason ?? undefined,
      rebuilt: false,
    })
  })
  // Completions verified (S33): each closure is checked once against chain
  // state at its block and kept in the summary.
  const unchecked = [...outcomes.values()].filter(
    ({ summary }) => summary?.closedBlock !== undefined && !summary.closure,
  )
  await eachLimited(unchecked, concurrency, async (outcome) => {
    const summary = outcome.summary!
    try {
      summary.closure = await readClosure(
        rpc,
        outcome.market,
        summary.closedBlock!,
      )
      await database.glassDoorMarketStatus.update({
        where: {
          chainId_address: { chainId, address: outcome.market.address },
        },
        data: { tailState: summary as unknown as Prisma.InputJsonValue },
      })
    } catch (error) {
      log(
        `chain ${chainId}: ${outcome.market.symbol} closure not checked: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  })

  // Quiet markets have no daily rows after their dataset, so each day close
  // records that day end's cash check for the quiet-time rule (H02).
  if (cut.dayClose) {
    await Promise.all(
      forward.map((market, index) => {
        const { summary } = outcomes.get(market.address)!
        const state = states[index]
        if (
          !summary ||
          summary.lastAccrualEnd === undefined ||
          state.isClosed ||
          BigInt(state.totalDebtsRaw) === 0n
        ) {
          return undefined
        }
        const check = {
          timestamp: state.timestamp,
          short:
            BigInt(state.requiredLiquidityRaw) > BigInt(state.totalAssetsRaw),
        }
        return database.glassDoorMarketStatus.update({
          where: { chainId_address: { chainId, address: market.address } },
          data: {
            tailState: {
              ...summary,
              tailDayEnds: [...(summary.tailDayEnds ?? []), check],
            } as unknown as Prisma.InputJsonValue,
          },
        })
      }),
    )
  }
  // A quiet market's dataset is still complete at this cut, unless its last
  // build failed; an audit flag does not stop that.
  const quiet = forward
    .filter((market) => {
      const row = status.get(market.address)!
      return !outcomes.get(market.address)?.reason || isAuditFlag(row)
    })
    .filter((market) => !touched.includes(market))
    .map((market) => market.address)
  if (quiet.length > 0) {
    await database.glassDoorMarketStatus.updateMany({
      where: {
        chainId,
        address: { in: quiet },
        OR: [
          { state: "Ok" },
          {
            state: "UnderReview",
            stateReason: { startsWith: AUDIT_REASON_PREFIX },
          },
        ],
      },
      data: { checkedThroughBlock: BigInt(cut.number) },
    })
  }
  return markets.map(
    (market) =>
      outcomes.get(market.address) ?? {
        market,
        state: "Preparing",
        rebuilt: false,
      },
  )
}

const cutsJson = (cuts: Map<ExportChainId, ChainCut>) =>
  Object.fromEntries(
    [...cuts].map(([chainId, cut]) => [
      chainId,
      { block: cut.number, hash: cut.hash, timestamp: cut.timestamp },
    ]),
  )

const isAtOrAfter = (
  next: Record<string, { block: number }>,
  current: Record<string, { block: number }>,
) =>
  Object.entries(current).every(
    ([chainId, cut]) => !next[chainId] || next[chainId].block >= cut.block,
  )

async function performUpdate(
  options: GlassDoorUpdateOptions,
  publicationId: string,
) {
  const {
    database,
    chainIds = GLASS_DOOR_CHAINS,
    concurrency = BUILD_CONCURRENCY,
    newMarketsPerRun = NEW_MARKETS_PER_RUN,
    firstBuildBudgetMs = FIRST_BUILD_BUDGET_MS,
    log = () => undefined,
  } = options
  const started = Date.now()
  const current = await database.glassDoorPublication.findFirst({
    where: { status: "Current" },
    orderBy: { publishedAt: "desc" },
  })
  const lastCuts = (current?.cuts ?? {}) as Record<
    string,
    { block: number; timestamp: number }
  >
  const rpcs = new Map(
    chainIds.map((chainId) => [chainId, new ExportRpcClient(chainId)]),
  )
  const cuts = new Map<ExportChainId, ChainCut>()
  for (const chainId of chainIds) {
    cuts.set(
      chainId,
      await chooseCut(
        database,
        rpcs.get(chainId)!,
        chainId,
        lastCuts[String(chainId)],
      ),
    )
  }
  const closingDays = new Set([...cuts.values()].map((cut) => cut.dayClose))
  const dayClose = closingDays.size === 1 ? [...closingDays][0] : undefined

  const outcomes: { chainId: ExportChainId; outcome: MarketOutcome }[] = []
  for (const chainId of chainIds) {
    const cut = cuts.get(chainId)!
    log(
      `chain ${chainId}: cut at block ${cut.number}${
        cut.dayClose ? ` (end of ${cut.dayClose})` : ""
      }`,
    )
    const results = await updateChain(
      database,
      chainId,
      rpcs.get(chainId)!,
      cut,
      concurrency,
      {
        newMarkets: newMarketsPerRun,
        firstBuildDeadline: started + firstBuildBudgetMs,
      },
      log,
    )
    results.forEach((outcome) => outcomes.push({ chainId, outcome }))
  }

  // Publish gates (gates.ts). A market failing its own checks is published
  // under review without values; counters are compared with the current
  // publication when it used the same formulas.
  const previousRows = current
    ? await database.glassDoorMetricSnapshot.findMany({
        where: { publicationId: current.id, chainId: { in: chainIds } },
      })
    : []
  const previousValues = new Map(
    previousRows.map((row) => [
      `${row.entityKind}:${row.chainId}:${row.entityAddress}`,
      row.values as Record<string, unknown>,
    ]),
  )
  const sameFormulas = current?.registryVersion === GLASS_DOOR_REGISTRY_VERSION
  const gated = new Map<MarketOutcome, string[]>()
  outcomes.forEach(({ chainId, outcome }) => {
    if (!outcome.metrics) return
    const problems = marketGateProblems(
      outcome.metrics,
      sameFormulas
        ? previousValues.get(`Market:${chainId}:${outcome.market.address}`)
        : undefined,
    )
    if (problems.length > 0) {
      gated.set(outcome, problems)
      log(
        `chain ${chainId}: ${
          outcome.market.symbol
        } held for review: ${problems.join("; ")}`,
      )
    }
  })

  // Whole-set gates hold the publication: every known market and every
  // market published last time must be in this run, and every block a
  // published market depends on must have been scanned.
  const holds: string[] = []
  const inRun = new Set(
    outcomes.map(
      ({ chainId, outcome }) => `${chainId}:${outcome.market.address}`,
    ),
  )
  const known = await database.glassDoorMarketStatus.findMany({
    where: { chainId: { in: chainIds } },
    select: { chainId: true, address: true },
  })
  known
    .filter((row) => !inRun.has(`${row.chainId}:${row.address}`))
    .forEach((row) =>
      holds.push(`${row.chainId}:${row.address} is known but not in this run`),
    )
  const publishing = new Set(
    outcomes
      .filter(({ outcome }) => outcome.metrics && outcome.summary)
      .map(({ chainId, outcome }) => `${chainId}:${outcome.market.address}`),
  )
  previousRows
    .filter(
      (row) =>
        row.entityKind === "Market" &&
        !publishing.has(`${row.chainId}:${row.entityAddress}`),
    )
    .forEach((row) =>
      holds.push(
        `${row.chainId}:${row.entityAddress} was published before but not now`,
      ),
    )
  for (const chainId of chainIds) {
    const ranges = await committedRanges(database, chainId)
    outcomes
      .filter(({ chainId: id, outcome }) => id === chainId && outcome.metrics)
      .forEach(({ outcome }) =>
        coverageGaps(
          ranges,
          {
            address: outcome.market.address,
            deploymentBlock: outcome.market.deploymentBlock,
            datasetBlock: outcome.summary?.datasetBlock,
          },
          cuts.get(chainId)!.number,
        ).forEach((gap) =>
          holds.push(`${chainId}:${outcome.market.address} ${gap} not scanned`),
        ),
      )
  }

  // Borrower roll-ups use only markets from this run that passed their gates.
  const byBorrower = new Map<
    string,
    { chainId: ExportChainId; summary: MarketSummary; metrics: MetricResults }[]
  >()
  outcomes.forEach(({ chainId, outcome }) => {
    if (!outcome.summary || !outcome.metrics || gated.has(outcome)) return
    const key = `${chainId}:${outcome.summary.borrower}`
    const group = byBorrower.get(key) ?? []
    group.push({ chainId, summary: outcome.summary, metrics: outcome.metrics })
    byBorrower.set(key, group)
  })

  const kind = dayClose ? "DayClose" : "Intraday"
  const cutJson = cutsJson(cuts)
  const nonFinite = outcomes.filter(({ outcome }) =>
    Object.values(outcome.metrics ?? {}).some(
      (value) => typeof value === "number" && !Number.isFinite(value),
    ),
  ).length
  const checks = {
    markets: outcomes.length,
    published: outcomes.filter(({ outcome }) => outcome.metrics).length,
    rebuilt: outcomes.filter(({ outcome }) => outcome.rebuilt).length,
    underReview: outcomes.filter(
      ({ outcome }) => outcome.state === "UnderReview",
    ).length,
    preparing: outcomes.filter(({ outcome }) => outcome.state === "Preparing")
      .length,
    marketsWithNonFiniteValues: nonFinite,
    marketsHeldForReview: gated.size,
    holds: holds.slice(0, 20),
  }
  await database.glassDoorPublication.update({
    where: { id: publicationId },
    data: {
      kind,
      day: dayClose ? new Date(`${dayClose}T00:00:00Z`) : null,
      cuts: cutJson,
      checks,
    },
  })
  // Borrowers first, so comparisons can draw on every borrower in the run.
  const borrowerRows = [...byBorrower].map(([key, group]) => {
    const [chainText, borrower] = key.split(":")
    const chainId = Number(chainText) as ExportChainId
    const states = outcomes
      .filter(
        ({ chainId: id, outcome }) =>
          id === chainId && outcome.market.borrower.toLowerCase() === borrower,
      )
      .map(({ outcome }) =>
        gated.has(outcome) ? "UnderReview" : outcome.state,
      )
    const partial = states.some((state) => state !== "Ok")
    const metrics = borrowerMetricsFrom(group)
    // A partial roll-up can legitimately count less than last time.
    const problems = borrowerGateProblems(
      metrics,
      sameFormulas && !partial
        ? previousValues.get(`Borrower:${chainId}:${borrower}`)
        : undefined,
    )
    if (problems.length > 0) {
      log(
        `chain ${chainId}: borrower ${borrower} held for review: ${problems.join(
          "; ",
        )}`,
      )
    }
    return { chainId, borrower, states, partial, metrics, problems }
  })

  // Comparisons span both chains: the protocol is one population.
  const comparableMarkets = outcomes
    .filter(
      ({ outcome }) =>
        outcome.metrics && outcome.summary && !gated.has(outcome),
    )
    .map(({ outcome }) => outcome.metrics!)
  const comparableBorrowers = borrowerRows
    .filter(({ problems }) => problems.length === 0)
    .map(({ metrics }) => metrics)
  const protocol = protocolCounts(comparableMarkets, comparableBorrowers)

  const rows: Prisma.GlassDoorMetricSnapshotCreateManyInput[] = []
  outcomes.forEach(({ chainId, outcome }) => {
    if (!outcome.metrics || !outcome.summary) return
    const problems = gated.get(outcome)
    rows.push({
      publicationId,
      entityKind: "Market",
      chainId,
      entityAddress: outcome.market.address,
      day: new Date(`${isoDay(cuts.get(chainId)!.timestamp)}T00:00:00Z`),
      values: problems ? {} : finite(outcome.metrics),
      flags: {
        state: problems ? "UnderReview" : outcome.state,
        reason: problems
          ? `Publish gate: ${problems.join("; ")}`
          : outcome.reason ?? null,
        borrower: outcome.summary.borrower,
        datasetBlock: outcome.summary.datasetBlock,
        rebuilt: outcome.rebuilt,
        protocol,
        ...(problems
          ? {}
          : {
              comparisons: marketComparisons(
                outcome.metrics,
                comparableMarkets,
              ),
            }),
      },
    })
  })
  borrowerRows.forEach(
    ({ chainId, borrower, states, partial, metrics, problems }) => {
      rows.push({
        publicationId,
        entityKind: "Borrower",
        chainId,
        entityAddress: borrower,
        day: new Date(`${isoDay(cuts.get(chainId)!.timestamp)}T00:00:00Z`),
        values: problems.length > 0 ? {} : finite(metrics),
        flags: {
          markets: states.length,
          partial,
          protocol,
          ...(problems.length > 0
            ? {
                state: "UnderReview",
                reason: `Publish gate: ${problems.join("; ")}`,
              }
            : {
                comparisons: borrowerComparisons(metrics, comparableBorrowers),
              }),
        },
      })
    },
  )
  await database.glassDoorMetricSnapshot.createMany({ data: rows })

  if (holds.length > 0) {
    log(`held by publish gates: ${holds.slice(0, 5).join("; ")}`)
    await database.glassDoorPublication.update({
      where: { id: publicationId },
      data: {
        status: "Failed",
        error: `Held by publish gates: ${holds.slice(0, 20).join("; ")}`.slice(
          0,
          2_000,
        ),
      },
    })
  }
  const switched =
    holds.length === 0 &&
    (await database.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${PUBLISH_LOCK})`
        const live = await transaction.glassDoorPublication.findFirst({
          where: { status: "Current" },
        })
        if (
          live &&
          !isAtOrAfter(cutJson, live.cuts as Record<string, { block: number }>)
        ) {
          await transaction.glassDoorPublication.update({
            where: { id: publicationId },
            data: {
              status: "Failed",
              error: "An earlier block than the current publication",
            },
          })
          return false
        }
        if (live) {
          await transaction.glassDoorPublication.update({
            where: { id: live.id },
            data: { status: "Superseded" },
          })
        }
        await transaction.glassDoorPublication.update({
          where: { id: publicationId },
          data: { status: "Current", publishedAt: new Date() },
        })
        return true
      },
      { maxWait: 5_000, timeout: 10_000 },
    ))

  await database.glassDoorPublication.deleteMany({
    where: {
      OR: [
        { kind: "Intraday", status: { in: ["Superseded", "Failed"] } },
        { status: "Staged" },
      ],
      createdAt: { lt: new Date(Date.now() - PRUNE_AFTER_MS) },
    },
  })

  const result = {
    skipped: false as const,
    publicationId,
    kind,
    day: dayClose,
    current: switched,
    cuts: cutJson,
    ...checks,
    seconds: Math.round((Date.now() - started) / 1000),
  }
  log(`published ${JSON.stringify(result)}`)
  return result
}

const LEASE_MS = 20 * 60 * 1_000

/**
 * Claims the run by creating its publication as Staged under the publish
 * lock. A Staged publication younger than the lease means another run is still
 * working, so this one stops instead of overlapping it.
 */
async function claimRun(database: PrismaClient) {
  return database.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${PUBLISH_LOCK})`
      const running = await transaction.glassDoorPublication.findFirst({
        where: {
          status: "Staged",
          createdAt: { gt: new Date(Date.now() - LEASE_MS) },
        },
        select: { id: true },
      })
      if (running) return undefined
      const claimed = await transaction.glassDoorPublication.create({
        data: {
          kind: "Intraday",
          cuts: {},
          registryVersion: GLASS_DOOR_REGISTRY_VERSION,
        },
        select: { id: true },
      })
      return claimed.id
    },
    { maxWait: 5_000, timeout: 10_000 },
  )
}

export async function runGlassDoorUpdate(options: GlassDoorUpdateOptions) {
  const publicationId = await claimRun(options.database)
  if (!publicationId) {
    options.log?.("skipped: another update is still running")
    return { skipped: true as const }
  }
  try {
    return await performUpdate(options, publicationId)
  } catch (error) {
    await options.database.glassDoorPublication
      .update({
        where: { id: publicationId },
        data: {
          status: "Failed",
          error: (error instanceof Error ? error.message : String(error)).slice(
            0,
            2_000,
          ),
        },
      })
      .catch(() => undefined)
    throw error
  }
}
