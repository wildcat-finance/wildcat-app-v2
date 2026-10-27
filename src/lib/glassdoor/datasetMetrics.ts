import { formatUnits, rayMul } from "../export/bigint"
import {
  DecodedMarketEvent,
  MarketDataset,
  MarketMetadata,
} from "../export/types"

// Glass Door metrics, using the cheat sheet v4 definitions at one block.
//
// Metrics are computed in two stages so the five-minute update can carry a
// quiet market forward without downloading its dataset:
//   summarizeMarket(dataset)              everything that only changes with
//                                         new events: totals, lenders,
//                                         batches, episodes and the recent
//                                         intervals that 90-day windows need
//   marketMetricsAt(summary, state)       those totals combined with the
//                                         market state at the publication's
//                                         block, so time-driven values move
// marketMetrics(dataset) is the same two stages at the dataset's own block.

export type MetricValue = number | string
export type MetricResults = Record<string, MetricValue>

const SECONDS_PER_YEAR = 31_536_000n
const BIPS_TO_RAY = 10n ** 23n
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const WINDOW_SECONDS = 90 * 86_400
const MINIMUM_WINDOW_RECORD = 7 * 86_400

const toBigInt = (value: unknown) => BigInt(String(value ?? 0))
const tokens = (raw: bigint | string, decimals: number) =>
  Number(formatUnits(BigInt(raw), decimals))
const hours = (seconds: number) => seconds / 3_600
const days = (seconds: number) => seconds / 86_400
const sum = (values: bigint[]) =>
  values.reduce((total, value) => total + value, 0n)

type Interval = [number, number]

/** Market state at the publication's block. */
export type MarketStateAt = {
  timestamp: number
  totalAssetsRaw: string
  requiredLiquidityRaw: string
  scaledTotalSupplyRaw: string
  totalSupplyRaw: string
  totalDebtsRaw: string
  normalizedUnclaimedWithdrawalsRaw: string
  maxTotalSupplyRaw: string
  timeDelinquentSeconds: number
  pendingWithdrawalExpiry: number
  annualInterestBips: number
  protocolFeeBips: number
  reserveRatioBips: number
  isClosed: boolean
  /** From the market's hooks instance; absent when it could not be read. */
  minimumDepositRaw?: string
}

/**
 * Bumped when the summary's fields or their formulas change; older summaries
 * are recomputed from the market's stored dataset.
 */
export const SUMMARY_VERSION = 2

/** Everything about a market that only changes when it emits events. */
export type MarketSummary = {
  version: number
  /**
   * The dataset's market metadata, so routine updates need not read it again.
   * Absent from summaries saved before it was added.
   */
  market?: MarketMetadata
  chainId: number
  address: string
  borrower: string
  symbol: string
  assetSymbol: string
  assetDecimals: number
  datasetBlock: number
  datasetTimestamp: number
  deployedDate: string
  deploymentTimestamp: number
  closedAt?: number
  /** Block of the MarketClosed event. */
  closedBlock?: number
  /**
   * Whether the closure covered everything owed: at the closing block,
   * totalAssets() >= totalDebts() and not delinquent. Checked once against
   * chain state by the update (S33).
   */
  closure?: { block: number; verified: boolean }
  graceSeconds: number
  delinquencyFeeBips: number
  withdrawalCycleSeconds: number
  funded: boolean
  lastAccrualEnd?: number
  /**
   * Cash checks at day ends after the last accrual: from the dataset's daily
   * rows, then one per day close while the market stays quiet. Absent from
   * summaries saved before the quiet-time rule.
   */
  tailDayEnds?: { timestamp: number; short: boolean }[]
  recordedSeconds: number
  penaltySeconds: number
  penaltyInterestRaw: string
  lenderInterestRaw: string
  supplySecondsRaw: string
  rateBipsSeconds: number
  /** Accrual intervals ending after datasetTimestamp - 90 days. */
  recentAccruals: Interval[]
  /** All episodes; an open episode's duration is as of datasetTimestamp. */
  episodes: { onset: number; cure?: number; durationSeconds: number }[]
  batches: {
    expired: number
    fundedAtExpiry: number
    paidAtExpiryRaw: string
    requestedAtExpiryRaw: string
    unpaid: number
    /** Short at expiry, then closed in a later transaction (D18). */
    paidLate?: number
    /** Short at expiry and still unpaid at the dataset's block (D18). */
    neverPaid?: number
  }
  flows: {
    borrowedRaw: string
    repaidRaw: string
    /** Sum of Deposit asset amounts (S31). */
    depositedRaw?: string
    borrowCount: number
    repayCount: number
    aprChanges: number
  }
  /** Addresses ever credited with market tokens (M49 exclusions). */
  lenders: string[]
  /** Current scaled balances of lenders, largest first. */
  lenderBalancesRaw: string[]
}

const eventsNamed = (dataset: MarketDataset, name: string) =>
  dataset.events.filter((event) => event.name === name)

const eventAmount = (event: DecodedMarketEvent) =>
  event.amountRaw ?? toBigInt(event.args.assetAmount)

const escrowAddresses = (dataset: MarketDataset) =>
  new Set(
    eventsNamed(dataset, "SanctionedAccountWithdrawalSentToEscrow").map(
      (event) => String(event.args.escrow).toLowerCase(),
    ),
  )

const lenderFilter = (dataset: MarketDataset) => {
  const market = dataset.market.address.toLowerCase()
  const escrows = escrowAddresses(dataset)
  return (address: string) =>
    address !== ZERO_ADDRESS && address !== market && !escrows.has(address)
}

/** Lender addresses ever credited with market tokens (M49 exclusions). */
export const lenderAddresses = (dataset: MarketDataset) => {
  const isLender = lenderFilter(dataset)
  const lenders = new Set<string>()
  eventsNamed(dataset, "Transfer").forEach((event) => {
    const to = String(event.args.to).toLowerCase()
    if (isLender(to)) lenders.add(to)
  })
  return lenders
}

export function summarizeMarket(dataset: MarketDataset): MarketSummary {
  const { market, interestAccruals: accruals, snapshotState: state } = dataset
  const first = dataset.dailySeries[0]
  if (!first) {
    throw new Error(`Dataset for ${market.address} has no daily rows`)
  }
  const isLender = lenderFilter(dataset)
  const windowFloor = dataset.snapshotTimestamp - WINDOW_SECONDS
  const expired = dataset.withdrawalBatches.filter(
    (batch) => batch.expiredBlock !== undefined,
  )
  const expiredEvents = eventsNamed(dataset, "WithdrawalBatchExpired")
  const lastAccrualEnd = accruals.length
    ? Math.max(...accruals.map((row) => row.periodEnd))
    : undefined
  const shortAtExpiry = expired.filter(
    (batch) =>
      toBigInt(batch.scaledAmountBurnedAtExpiryRaw) <
      toBigInt(batch.scaledTotalAmountRaw),
  )
  return {
    version: SUMMARY_VERSION,
    market,
    chainId: market.chainId,
    address: market.address.toLowerCase(),
    borrower: market.borrower.toLowerCase(),
    symbol: market.symbol,
    assetSymbol: market.assetSymbol,
    assetDecimals: market.assetDecimals,
    datasetBlock: dataset.snapshotBlock,
    datasetTimestamp: dataset.snapshotTimestamp,
    deployedDate: first.date_utc,
    deploymentTimestamp: Date.parse(first.period_start_timestamp_utc) / 1_000,
    closedAt: eventsNamed(dataset, "MarketClosed")[0]?.timestamp,
    closedBlock: eventsNamed(dataset, "MarketClosed")[0]?.blockNumber,
    graceSeconds: state.delinquencyGracePeriodSeconds,
    delinquencyFeeBips: state.delinquencyFeeBips,
    withdrawalCycleSeconds: state.withdrawalBatchDurationSeconds,
    funded: eventsNamed(dataset, "Deposit").length > 0,
    lastAccrualEnd,
    tailDayEnds:
      lastAccrualEnd === undefined
        ? []
        : dataset.dailySeries
            .map((row) => ({
              timestamp: Date.parse(row.snapshot_timestamp_utc) / 1_000,
              short:
                BigInt(dataset.dayEndRequiredLiquidity[row.date_utc]) >
                BigInt(row.total_assets_held_raw),
            }))
            .filter((check) => check.timestamp > lastAccrualEnd),
    recordedSeconds: accruals.reduce(
      (total, row) => total + (row.periodEnd - row.periodStart),
      0,
    ),
    penaltySeconds: accruals.reduce((total, row) => {
      if (row.delinquencyFeeBips === 0) return total
      return (
        total +
        Number(
          (row.delinquencyFeeRay * SECONDS_PER_YEAR) /
            (BigInt(row.delinquencyFeeBips) * BIPS_TO_RAY),
        )
      )
    }, 0),
    penaltyInterestRaw: String(
      sum(accruals.map((row) => row.penaltyInterestAssetsRaw)),
    ),
    lenderInterestRaw: String(
      sum(
        accruals.map(
          (row) => row.baseInterestAssetsRaw + row.penaltyInterestAssetsRaw,
        ),
      ),
    ),
    supplySecondsRaw: String(
      sum(
        accruals.map(
          (row) =>
            rayMul(row.scaledTotalSupplyRaw, row.scaleFactorBeforeRay) *
            BigInt(row.periodEnd - row.periodStart),
        ),
      ),
    ),
    rateBipsSeconds: accruals.reduce(
      (total, row) =>
        total + row.annualInterestBips * (row.periodEnd - row.periodStart),
      0,
    ),
    recentAccruals: accruals
      .filter((row) => row.periodEnd > windowFloor)
      .map((row): Interval => [row.periodStart, row.periodEnd]),
    episodes: dataset.manifest.delinquencyEpisodes.map((episode) => ({
      onset: episode.onsetTimestamp,
      ...(episode.isOpen ? {} : { cure: episode.cureTimestamp }),
      durationSeconds: episode.durationSeconds,
    })),
    batches: {
      expired: expiredEvents.length,
      fundedAtExpiry: expiredEvents.filter(
        (event) =>
          toBigInt(event.args.scaledAmountBurned) ===
          toBigInt(event.args.scaledTotalAmount),
      ).length,
      paidAtExpiryRaw: String(
        sum(
          expired.map((batch) =>
            toBigInt(batch.normalizedAmountPaidAtExpiryRaw),
          ),
        ),
      ),
      requestedAtExpiryRaw: String(
        sum(
          expired.map((batch) =>
            rayMul(
              toBigInt(batch.scaledTotalAmountRaw),
              toBigInt(batch.scaleFactorAtExpiryRay),
            ),
          ),
        ),
      ),
      unpaid: dataset.withdrawalBatches.filter(
        (batch) => batch.status === "unpaid",
      ).length,
      paidLate: shortAtExpiry.filter((batch) => batch.status === "closed")
        .length,
      neverPaid: shortAtExpiry.filter((batch) => batch.status === "unpaid")
        .length,
    },
    flows: {
      borrowedRaw: String(sum(eventsNamed(dataset, "Borrow").map(eventAmount))),
      repaidRaw: String(
        sum(eventsNamed(dataset, "DebtRepaid").map(eventAmount)),
      ),
      depositedRaw: String(
        sum(eventsNamed(dataset, "Deposit").map(eventAmount)),
      ),
      borrowCount: eventsNamed(dataset, "Borrow").length,
      repayCount: eventsNamed(dataset, "DebtRepaid").length,
      aprChanges: eventsNamed(dataset, "AnnualInterestBipsUpdated").length,
    },
    lenders: [...lenderAddresses(dataset)].sort(),
    lenderBalancesRaw: Object.entries(dataset.holders)
      .filter(([address, balance]) => isLender(address) && BigInt(balance) > 0n)
      .map(([, balance]) => BigInt(balance))
      .sort((left, right) => Number(right - left > 0n) - Number(right < left))
      .map(String),
  }
}

/** The market state at the dataset's own snapshot block. */
export const stateAtDataset = (dataset: MarketDataset): MarketStateAt => ({
  timestamp: dataset.snapshotTimestamp,
  totalAssetsRaw: dataset.snapshotState.totalAssetsRaw,
  requiredLiquidityRaw: dataset.snapshotState.requiredLiquidityRaw,
  scaledTotalSupplyRaw: dataset.snapshotState.scaledTotalSupplyRaw,
  totalSupplyRaw: dataset.manifest.reconciliation.onchainTotalSupplyRaw,
  totalDebtsRaw: dataset.manifest.reconciliation.onchainTotalDebtsRaw,
  normalizedUnclaimedWithdrawalsRaw:
    dataset.snapshotState.normalizedUnclaimedWithdrawalsRaw,
  maxTotalSupplyRaw: dataset.snapshotState.maxTotalSupplyRaw,
  timeDelinquentSeconds: dataset.snapshotState.timeDelinquentSeconds,
  pendingWithdrawalExpiry: dataset.snapshotState.pendingWithdrawalExpiry,
  annualInterestBips: dataset.snapshotState.annualInterestBips,
  protocolFeeBips: dataset.snapshotState.protocolFeeBips,
  reserveRatioBips: dataset.snapshotState.reserveRatioBips,
  isClosed: dataset.snapshotState.isClosed,
})

const overlap = ([start, end]: Interval, [from, to]: Interval) =>
  Math.max(0, Math.min(end, to) - Math.max(start, from))

/** Total length of the union of intervals, clipped to a window. */
const unionLength = (intervals: Interval[], window: Interval) => {
  let total = 0
  let reached = window[0]
  ;[...intervals]
    .map(
      ([start, end]): Interval => [
        Math.max(start, window[0]),
        Math.min(end, window[1]),
      ],
    )
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0])
    .forEach(([start, end]) => {
      if (end <= reached) return
      total += end - Math.max(start, reached)
      reached = end
    })
  return total
}

/**
 * The parts of the silent tail [start, at] when the market was short of cash.
 * Each stretch between checks counts if the day end that closes it showed a
 * shortfall; the last stretch counts if the market is short at `at`.
 * (product#908 ruling: quiet time is late only when cash was short.)
 */
const lateTailIntervals = (
  summary: MarketSummary,
  start: number,
  at: number,
  shortAtCut: boolean,
) => {
  const intervals: Interval[] = []
  let from = start
  ;(summary.tailDayEnds ?? [])
    .filter((check) => check.timestamp > start && check.timestamp < at)
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((check) => {
      if (check.short) intervals.push([from, check.timestamp])
      from = check.timestamp
    })
  if (shortAtCut) intervals.push([from, at])
  return intervals
}

/** Recorded and delinquent seconds inside the 90 days before `at`. */
const windowSeconds = (
  summary: MarketSummary,
  at: number,
  tail: number,
  lateTail: Interval[],
) => {
  const window: Interval = [at - WINDOW_SECONDS, at]
  const recorded =
    summary.recentAccruals.reduce(
      (total, interval) => total + overlap(interval, window),
      0,
    ) + (tail > 0 ? overlap([at - tail, at], window) : 0)
  const delinquent = unionLength(
    [
      ...summary.episodes.map(
        (episode): Interval => [episode.onset, episode.cure ?? at],
      ),
      ...lateTail,
    ],
    window,
  )
  return { recorded, delinquent }
}

export function marketMetricsAt(
  summary: MarketSummary,
  state: MarketStateAt,
): MetricResults {
  const decimals = summary.assetDecimals
  const at = state.timestamp
  const grace = summary.graceSeconds

  // Right now: delinquency is coverageLiquidity() > totalAssets(), never the
  // stored flag; the grace clock is currentState().timeDelinquent.
  const shortOfCash =
    toBigInt(state.requiredLiquidityRaw) > toBigInt(state.totalAssetsRaw)

  // Helpers H01, H02, H08, H09. The silent tail (H08) is recorded time; it
  // counts as delinquent only where the market was short of cash.
  const totalDebts = toBigInt(state.totalDebtsRaw)
  const tail =
    totalDebts > 0n &&
    summary.closedAt === undefined &&
    summary.lastAccrualEnd !== undefined
      ? at - summary.lastAccrualEnd
      : 0
  const tailPenalised = state.timeDelinquentSeconds > grace ? 1 : 0
  const recordedLife = summary.recordedSeconds + tail
  const lateTail =
    tail > 0 ? lateTailIntervals(summary, at - tail, at, shortOfCash) : []
  const elapsed = at - summary.datasetTimestamp
  const episodes = summary.episodes.map((episode) =>
    episode.cure === undefined
      ? { ...episode, durationSeconds: episode.durationSeconds + elapsed }
      : episode,
  )
  // An episode still open at `at` already covers the tail it overlaps.
  const delinquentSeconds =
    episodes
      .filter((episode) => episode.cure !== undefined)
      .reduce((total, episode) => total + episode.durationSeconds, 0) +
    unionLength(
      [
        ...episodes
          .filter((episode) => episode.cure === undefined)
          .map((episode): Interval => [episode.onset, at]),
        ...lateTail,
      ],
      [0, at],
    )

  // Episodes (StateUpdated walk, cheat sheet H02)
  const closed = episodes.filter((episode) => episode.cure !== undefined)
  const closedHours = closed.map((episode) => hours(episode.durationSeconds))
  const longestHours = Math.max(
    0,
    ...episodes.map((episode) => hours(episode.durationSeconds)),
  )
  const lastCure = Math.max(0, ...closed.map((episode) => episode.cure ?? 0))

  // Trailing 90 days (M67, M68)
  const window = windowSeconds(summary, at, tail, lateTail)
  const inOrder = recordedLife
    ? 100 * (1 - delinquentSeconds / recordedLife)
    : 100
  const trailing =
    window.recorded >= MINIMUM_WINDOW_RECORD
      ? 100 * (1 - window.delinquent / window.recorded)
      : ""

  const timeDelinquent = state.timeDelinquentSeconds
  const lateWithinGrace = shortOfCash && timeDelinquent <= grace ? 1 : 0
  const pastGrace = timeDelinquent > grace ? 1 : 0
  const graceCountdown = (() => {
    if (pastGrace) return `${hours(timeDelinquent - grace)} h past grace`
    if (lateWithinGrace) return hours(grace - timeDelinquent)
    return "no countdown (not late)"
  })()
  const cycleStatus =
    state.pendingWithdrawalExpiry > at
      ? `current cycle ends in ${hours(state.pendingWithdrawalExpiry - at)} h`
      : "next cycle starts with the next withdrawal request"

  const { batches, flows } = summary
  const borrowed = toBigInt(flows.borrowedRaw)
  const repaid = toBigInt(flows.repaidRaw)
  const penaltyInterest = toBigInt(summary.penaltyInterestRaw)
  const lenderInterest = toBigInt(summary.lenderInterestRaw)
  const supplySeconds = toBigInt(summary.supplySecondsRaw)
  const paidAtExpiry = toBigInt(batches.paidAtExpiryRaw)
  const requestedAtExpiry = toBigInt(batches.requestedAtExpiryRaw)
  const maxTotalSupply = toBigInt(state.maxTotalSupplyRaw)
  const scaledSupply = toBigInt(state.scaledTotalSupplyRaw)
  const largestBalance = toBigInt(summary.lenderBalancesRaw[0] ?? "0")
  const { paidLate, neverPaid } = batches
  const activeLenders = summary.lenderBalancesRaw.length
  const distinctLenders = summary.lenders.length

  return {
    H01: recordedLife,
    H02: delinquentSeconds,
    H08: tail,
    H09: tailPenalised,
    M01: summary.symbol,
    /** The full market name, shown with the symbol (M01). */
    MARKET_NAME: summary.market?.name ?? "",
    M02: summary.assetSymbol,
    M03: summary.deployedDate,
    M05: days((summary.closedAt ?? at) - summary.deploymentTimestamp),
    M06: tokens(maxTotalSupply, decimals),
    M07: tokens(totalDebts, decimals),
    M08: tokens(state.totalAssetsRaw, decimals),
    M11: state.annualInterestBips / 100,
    M12: summary.delinquencyFeeBips / 100,
    M13: state.protocolFeeBips / 100,
    M14: state.reserveRatioBips / 100,
    M15: hours(grace),
    M16: hours(summary.withdrawalCycleSeconds),
    M18: inOrder,
    M20: closed.length,
    M21: lateWithinGrace,
    M22: closedHours.length
      ? closedHours.reduce((a, b) => a + b, 0) / closedHours.length
      : 0,
    M23: longestHours,
    M24: grace ? (100 * longestHours) / hours(grace) : 0,
    M26: recordedLife
      ? (100 * (summary.penaltySeconds + tail * tailPenalised)) / recordedLife
      : 0,
    M27: tokens(penaltyInterest, decimals),
    M30: batches.expired,
    M31: batches.fundedAtExpiry,
    M32: batches.expired ? (100 * batches.fundedAtExpiry) / batches.expired : 0,
    M33: requestedAtExpiry
      ? (100 * Number(paidAtExpiry)) / Number(requestedAtExpiry)
      : 0,
    M37: batches.unpaid,
    M38: tokens(state.normalizedUnclaimedWithdrawalsRaw, decimals),
    M39: supplySeconds
      ? (100 * Number(lenderInterest * SECONDS_PER_YEAR)) /
        Number(supplySeconds)
      : 0,
    M40: recordedLife
      ? (summary.rateBipsSeconds + state.annualInterestBips * tail) /
        recordedLife /
        100
      : 0,
    M41: tokens(lenderInterest, decimals),
    M42: lenderInterest
      ? (100 * Number(penaltyInterest)) / Number(lenderInterest)
      : 0,
    M44: flows.aprChanges,
    M48: activeLenders,
    M49: distinctLenders,
    M51: distinctLenders ? (100 * activeLenders) / distinctLenders : 0,
    M56: tokens(borrowed, decimals),
    M57: tokens(repaid, decimals),
    M58: tokens(borrowed - repaid, decimals),
    M59: flows.borrowCount,
    M60: flows.repayCount,
    M67: trailing,
    M68: trailing === "" ? "" : trailing - inOrder,
    M69: closedHours.filter((value) => value < 6).length,
    M70: closedHours.filter((value) => value >= 6 && value < 24).length,
    M71: closedHours.filter((value) => value >= 24 && value <= 48).length,
    M72: closedHours.filter((value) => value > 48).length,
    M77: summary.closedAt === undefined ? "Open" : "Closed",
    M80: hours(tail),
    M82:
      summary.lastAccrualEnd === undefined
        ? 0
        : hours(at - summary.lastAccrualEnd),
    M84: lastCure ? days(at - lastCure) : 0,
    M85: pastGrace,
    M86: maxTotalSupply
      ? (100 * Number(toBigInt(state.totalSupplyRaw))) / Number(maxTotalSupply)
      : 0,
    D05: graceCountdown,
    D06: cycleStatus,
    D03:
      state.minimumDepositRaw === undefined
        ? ""
        : tokens(state.minimumDepositRaw, decimals),
    D10: scaledSupply
      ? (100 * Number(largestBalance)) / Number(scaledSupply)
      : 0,
    D17: days(delinquentSeconds),
    // Batches short at expiry: paid late / never paid (as of the dataset).
    D18:
      paidLate === undefined || neverPaid === undefined
        ? ""
        : `${paidLate} / ${neverPaid}`,
    D18_LATE: paidLate ?? "",
    D18_NEVER: neverPaid ?? "",
    /** Window days, the S27 weight. */
    WINDOW_DAYS: days(window.recorded),
  }
}

export const marketMetrics = (dataset: MarketDataset): MetricResults =>
  marketMetricsAt(summarizeMarket(dataset), stateAtDataset(dataset))

export function borrowerMetricsFrom(
  markets: { summary: MarketSummary; metrics: MetricResults }[],
): MetricResults {
  const funded = markets.filter(({ summary }) => summary.funded)
  const values = (id: string) =>
    funded.map(({ metrics }) => Number(metrics[id]))
  const total = (id: string) => values(id).reduce((a, b) => a + b, 0)
  const batchesExpired = total("M30")
  const batchesFunded = total("M31")
  const closedDurations = funded.flatMap(({ summary }) =>
    summary.episodes
      .filter((episode) => episode.cure !== undefined)
      .map((episode) => episode.durationSeconds),
  )
  const lenders = new Set(funded.flatMap(({ summary }) => summary.lenders))
  const withExits = funded.filter(({ metrics }) => Number(metrics.M30) > 0)
  const weighted = (id: string, weight: string) => {
    const rows = funded.filter(({ metrics }) => metrics[id] !== "")
    const totalWeight = rows.reduce(
      (sumOfWeights, { metrics }) => sumOfWeights + Number(metrics[weight]),
      0,
    )
    return totalWeight
      ? rows.reduce(
          (sumOfValues, { metrics }) =>
            sumOfValues + Number(metrics[id]) * Number(metrics[weight]),
          0,
        ) / totalWeight
      : ""
  }
  // Whole-market debt in each market's own token. Summing across different
  // assets needs prices, which the reference borrower's late markets avoid.
  const debtWhere = (flag: string) =>
    funded
      .filter(({ metrics }) => Number(metrics[flag]) === 1)
      .reduce((sumOfDebt, { metrics }) => sumOfDebt + Number(metrics.M07), 0)
  const inOrderAll = weighted("M18", "M05")
  // Completed facilities: closed markets that ever took deposits.
  const completed = funded.filter(
    ({ summary }) => summary.closedAt !== undefined,
  )
  const deposited = completed.map(({ summary }) =>
    summary.flows.depositedRaw === undefined
      ? undefined
      : tokens(summary.flows.depositedRaw, summary.assetDecimals),
  )
  const totalAge = total("M05")
  const openAtClose = ({ summary }: { summary: MarketSummary }) =>
    summary.episodes.some(
      (episode) =>
        episode.onset <= summary.closedAt! &&
        (episode.cure === undefined || episode.cure > summary.closedAt!),
    )
  const batchSplitKnown = funded.every(
    ({ metrics }) => metrics.D18_LATE !== "" && metrics.D18_NEVER !== "",
  )
  const trailingAll = weighted("M67", "WINDOW_DAYS")
  const contractKept = weighted("M26", "M05")
  return {
    S01: funded.length,
    /** Market-days on record across the book: the evidence depth. */
    MARKET_DAYS: totalAge,
    S02: funded.map(({ summary }) => summary.deployedDate).sort()[0] ?? "",
    S05: inOrderAll,
    S06: funded.length ? Math.min(...values("M18")) : "",
    S07: funded.length ? Math.max(...values("M18")) : "",
    // Finished episodes (M20) plus any still open (product#908 ruling).
    S12: funded.reduce(
      (count, { summary }) => count + summary.episodes.length,
      0,
    ),
    S14: batchesExpired,
    S15: batchesFunded,
    S16: batchesExpired ? (100 * batchesFunded) / batchesExpired : 0,
    S17: withExits.length
      ? Math.min(...withExits.map(({ metrics }) => Number(metrics.M32)))
      : "",
    S18: funded.filter(
      ({ metrics }) => Number(metrics.M21) === 1 || Number(metrics.M85) === 1,
    ).length,
    S27: trailingAll,
    S30: completed.length,
    // Whole-market amounts in each market's own token, as S35 and S36.
    S31: deposited.every((amount) => amount !== undefined)
      ? deposited.reduce<number>(
          (sumOfAmounts, amount) => sumOfAmounts + (amount ?? 0),
          0,
        )
      : "",
    S32: totalAge
      ? (100 *
          completed.reduce(
            (sumOfAges, { metrics }) => sumOfAges + Number(metrics.M05),
            0,
          )) /
        totalAge
      : "",
    // Shown as S33 of S30; only a stored chain check counts as verified.
    S33: completed.filter(({ summary }) => summary.closure?.verified).length,
    S34: completed.filter((market) => !openAtClose(market)).length,
    S28:
      trailingAll === "" || inOrderAll === "" ? "" : trailingAll - inOrderAll,
    S35: debtWhere("M21"),
    S36: debtWhere("M85"),
    S37: lenders.size,
    D15: days(Math.max(0, ...values("M23")) * 3_600),
    D16: closedDurations.length
      ? hours(closedDurations.reduce((a, b) => a + b, 0)) /
        closedDurations.length
      : 0,
    D21: contractKept === "" ? "" : 100 - contractKept,
    D18: batchSplitKnown ? `${total("D18_LATE")} / ${total("D18_NEVER")}` : "",
  }
}

export const borrowerMetrics = (datasets: MarketDataset[]): MetricResults =>
  borrowerMetricsFrom(
    datasets.map((dataset) => ({
      summary: summarizeMarket(dataset),
      metrics: marketMetrics(dataset),
    })),
  )
