/** @jest-environment node */

import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  borrowerMetricsFrom,
  MarketStateAt,
  MarketSummary,
  marketMetrics,
  marketMetricsAt,
  summarizeMarket,
} from "./datasetMetrics"
import { buildMarketDataset } from "../export/ledger/buildMarketDataset"
import { discoverMarketUniverse } from "../export/sources/discovery"
import { decodeRecording } from "../export/sources/recording"
import { fromHex } from "../export/sources/rpc"

const DAY = 86_400
const T0 = 1_790_000_000

// A market whose last accrual was at T0, read four quiet days later.
const summary = (overrides: Partial<MarketSummary> = {}): MarketSummary => ({
  version: 1,
  chainId: 1,
  address: `0x${"a".repeat(40)}`,
  borrower: `0x${"b".repeat(40)}`,
  symbol: "TEST",
  assetSymbol: "USDC",
  assetDecimals: 6,
  datasetBlock: 1,
  datasetTimestamp: T0,
  deployedDate: "2026-01-01",
  deploymentTimestamp: T0 - 100 * DAY,
  graceSeconds: DAY,
  delinquencyFeeBips: 1_000,
  withdrawalCycleSeconds: DAY,
  funded: true,
  lastAccrualEnd: T0,
  recordedSeconds: 100 * DAY,
  penaltySeconds: 0,
  penaltyInterestRaw: "0",
  lenderInterestRaw: "0",
  supplySecondsRaw: "0",
  rateBipsSeconds: 0,
  recentAccruals: [[T0 - 90 * DAY, T0]],
  episodes: [],
  batches: {
    expired: 0,
    fundedAtExpiry: 0,
    paidAtExpiryRaw: "0",
    requestedAtExpiryRaw: "0",
    unpaid: 0,
  },
  flows: {
    borrowedRaw: "0",
    repaidRaw: "0",
    borrowCount: 0,
    repayCount: 0,
    aprChanges: 0,
  },
  lenders: [],
  lenderBalancesRaw: [],
  ...overrides,
})

const at = T0 + 4 * DAY
const state = (short: boolean): MarketStateAt => ({
  timestamp: at,
  totalAssetsRaw: short ? "50" : "200",
  requiredLiquidityRaw: "100",
  scaledTotalSupplyRaw: "1000",
  totalSupplyRaw: "1000",
  totalDebtsRaw: "1000",
  normalizedUnclaimedWithdrawalsRaw: "0",
  maxTotalSupplyRaw: "10000",
  timeDelinquentSeconds: 0,
  pendingWithdrawalExpiry: 0,
  annualInterestBips: 1_000,
  protocolFeeBips: 0,
  reserveRatioBips: 1_000,
  isClosed: false,
})
const dayEnds = (...short: boolean[]) =>
  short.map((value, index) => ({
    timestamp: T0 + (index + 1) * DAY,
    short: value,
  }))

describe("quiet time (silent tail)", () => {
  it("counts as recorded but not late while the market holds enough cash", () => {
    const metrics = marketMetricsAt(
      summary({ tailDayEnds: dayEnds(false, false, false) }),
      state(false),
    )
    expect(metrics.H08).toBe(4 * DAY)
    expect(metrics.H01).toBe(104 * DAY)
    expect(metrics.H02).toBe(0)
    expect(metrics.M18).toBe(100)
  })

  it("counts each stretch whose closing day end, or the cut, showed a shortfall", () => {
    const shortAtCut = marketMetricsAt(
      summary({ tailDayEnds: dayEnds(false, false, false) }),
      state(true),
    )
    expect(shortAtCut.H02).toBe(DAY)

    // Short at the second day end, then repaid by a plain transfer.
    const curedByTransfer = marketMetricsAt(
      summary({ tailDayEnds: dayEnds(false, true, false) }),
      state(false),
    )
    expect(curedByTransfer.H02).toBe(DAY)
  })

  it("judges the whole tail by the cut when no day-end checks are stored", () => {
    expect(marketMetricsAt(summary(), state(true)).H02).toBe(4 * DAY)
    expect(marketMetricsAt(summary(), state(false)).H02).toBe(0)
  })

  it("does not count a tail twice when an episode is still open", () => {
    const metrics = marketMetricsAt(
      summary({
        episodes: [{ onset: T0 - 2 * DAY, durationSeconds: 2 * DAY }],
        tailDayEnds: dayEnds(true, true, true),
      }),
      state(true),
    )
    expect(metrics.H02).toBe(6 * DAY)
  })

  it("keeps quiet time in the 90-day window's recorded time", () => {
    const metrics = marketMetricsAt(
      summary({ tailDayEnds: dayEnds(false, false, false) }),
      state(true),
    )
    // 86 recorded days in the window plus the 4-day tail; the last day is late.
    expect(metrics.WINDOW_DAYS).toBe(90)
    expect(metrics.M67).toBeCloseTo(100 * (1 - 1 / 90), 10)
  })
})

describe("completed facilities (S30-S34) and uncovered deadlines (D18)", () => {
  const closedAt = T0 - 10 * DAY
  const base = summary()
  const market = (
    overrides: Partial<MarketSummary>,
    depositedRaw: string,
    batches: { expired: number; funded: number; late: number; never: number },
  ) =>
    summary({
      ...overrides,
      flows: { ...base.flows, depositedRaw },
      batches: {
        ...base.batches,
        expired: batches.expired,
        fundedAtExpiry: batches.funded,
        paidLate: batches.late,
        neverPaid: batches.never,
      },
    })
  // Closed after repaying, closure verified, last episode cured before close.
  const completed = market(
    {
      closedAt,
      closedBlock: 500,
      closure: { block: 500, verified: true },
      episodes: [
        {
          onset: closedAt - DAY,
          cure: closedAt - 3_600,
          durationSeconds: DAY - 3_600,
        },
      ],
    },
    "5000000",
    { expired: 3, funded: 1, late: 2, never: 0 },
  )
  // Closed with an episode still open; its closure is not checked yet.
  const troubled = market(
    {
      closedAt,
      closedBlock: 600,
      episodes: [{ onset: closedAt - DAY, durationSeconds: DAY }],
    },
    "1000000",
    { expired: 0, funded: 0, late: 0, never: 0 },
  )
  const open = market({}, "7000000", {
    expired: 5,
    funded: 2,
    late: 1,
    never: 2,
  })
  const roll = (summaries: MarketSummary[]) =>
    borrowerMetricsFrom(
      summaries.map((item) => ({
        summary: item,
        metrics: marketMetricsAt(item, {
          ...state(false),
          minimumDepositRaw: "1000000",
        }),
      })),
    )

  it("counts, sizes and checks the borrower's completed facilities", () => {
    const metrics = roll([completed, troubled, open])
    expect(metrics.S30).toBe(2)
    expect(metrics.S31).toBe(6)
    // Ages: 90 days for each closed market, 104 for the open one.
    expect(metrics.S32).toBeCloseTo((100 * 180) / 284, 10)
    expect(metrics.S33).toBe(1)
    expect(metrics.S34).toBe(1)
  })

  it("splits uncovered deadlines per market and in total", () => {
    const metrics = marketMetricsAt(open, state(false))
    expect([metrics.D18, metrics.D18_LATE, metrics.D18_NEVER]).toEqual([
      "1 / 2",
      1,
      2,
    ])
    expect(roll([completed, troubled, open]).D18).toBe("3 / 2")
  })

  it("reads the minimum deposit in tokens, or no data", () => {
    expect(
      marketMetricsAt(open, { ...state(false), minimumDepositRaw: "1000000" })
        .D03,
    ).toBe(1)
    expect(marketMetricsAt(open, state(false)).D03).toBe("")
  })

  it("shows no completed facilities as zero, not as missing", () => {
    const metrics = roll([open])
    expect([
      metrics.S30,
      metrics.S31,
      metrics.S32,
      metrics.S33,
      metrics.S34,
    ]).toEqual([0, 0, 0, 0, 0])
  })

  it("finds the closure and deposits of a recorded closed market", async () => {
    const MARKET = "0xeafa12cc0905baabed8618584f0796f5d19da3c4"
    const SNAPSHOT = 25_632_396
    const recording = decodeRecording(
      await readFile(
        path.join(
          process.cwd(),
          "src/lib/export/__fixtures__/reference-market-c-25632396.json.gz",
        ),
      ),
    )
    const universe = await discoverMarketUniverse(recording.rpc, 1, SNAPSHOT, [
      MARKET,
    ])
    const snapshot = await recording.rpc.getBlock(SNAPSHOT)
    const dataset = await buildMarketDataset(
      recording.rpc,
      universe.markets[0],
      SNAPSHOT,
      snapshot.hash,
      fromHex(snapshot.timestamp),
      [],
      recording.explorer,
    )
    const closedEvent = dataset.events.find(
      (event) => event.name === "MarketClosed",
    )!
    const closed = summarizeMarket(dataset)
    expect(closed.closedBlock).toBe(closedEvent.blockNumber)
    expect(closed.closedAt).toBe(closedEvent.timestamp)
    expect(BigInt(closed.flows.depositedRaw!)).toBeGreaterThan(0n)
    const metrics = marketMetrics(dataset)
    expect(Number(metrics.D18_LATE) + Number(metrics.D18_NEVER)).toBe(
      Number(metrics.M30) - Number(metrics.M31),
    )
    expect(borrowerMetricsFrom([{ summary: closed, metrics }]).S30).toBe(1)
  }, 120_000)
})
