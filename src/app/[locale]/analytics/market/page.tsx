"use client"

/* eslint-disable no-nested-ternary */
// ============================================================
// Wildcat Analytics Dashboard — Market Detail Page
// ============================================================
// Data: Wildcat V2 subgraph on Goldsky
//
// ARCHITECTURE: Each section fetches its own data independently.
// If a section's query fails, it logs to console and shows an
// inline error — other sections are unaffected.
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react"

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts"

// ============================================================
// TYPES — Subgraph raw response shapes
// ============================================================

interface RawToken {
  symbol: string
  decimals: number
  address: string
}

interface RawMarket {
  id: string
  name: string
  symbol: string
  decimals: number
  borrower: string
  asset: RawToken
  hooks: { kind: "OpenTerm" | "FixedTerm" | "Unknown" } | null
  hooksConfig: { fixedTermEndTime: number } | null
  annualInterestBips: number
  reserveRatioBips: number
  delinquencyGracePeriod: number
  delinquencyFeeBips: number
  withdrawalBatchDuration: number
  maxTotalSupply: string
  scaledTotalSupply: string
  scaleFactor: string
  isDelinquent: boolean
  isIncurringPenalties: boolean
  isClosed: boolean
  timeDelinquent: number
  protocolFeeBips: number
  totalBorrowed: string
  totalRepaid: string
  totalDeposited: string
  totalBaseInterestAccrued: string
  totalDelinquencyFeesAccrued: string
  totalProtocolFeesAccrued: string
  pendingProtocolFees: string
  normalizedUnclaimedWithdrawals: string
  createdAt: number
}

interface RawMarketDailyStats {
  startTimestamp: number
  totalDeposited: string
  totalWithdrawalsRequested: string
  totalWithdrawalsExecuted: string
  totalBorrowed: string
  totalRepaid: string
  totalDebt?: string
}

interface RawLenderAccount {
  address: string
  scaledBalance: string
  totalDeposited: string
  totalInterestEarned: string
  addedTimestamp: number
}

interface RawWithdrawalBatch {
  id: string
  expiry: string
  scaledTotalAmount: string
  scaledAmountBurned: string
  normalizedAmountPaid: string
  totalNormalizedRequests: string
  isExpired: boolean
  isClosed: boolean
  lenderWithdrawalsCount: number
  creation: { blockTimestamp: number }
  expiration: {
    normalizedAmountPaid: string
    normalizedAmountOwed: string
    blockTimestamp: number
  } | null
}

interface RawDelinquencyEvent {
  isDelinquent: boolean
  blockTimestamp: number
  liquidityCoverageRequired: string
  totalAssets: string
}

interface RawMarketInterestAccrued {
  fromTimestamp: number
  toTimestamp: number
  baseInterestAccrued: string
  delinquencyFeesAccrued: string
  protocolFeesAccrued: string
  blockTimestamp: number
}

interface RawTransfer {
  from: { address: string }
  to: { address: string }
  amount: string
  blockTimestamp: number
  transactionHash: string
}

interface RawParameterChanges {
  annualInterestBipsUpdateds: {
    oldAnnualInterestBips: number
    newAnnualInterestBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  reserveRatioBipsUpdateds: {
    oldReserveRatioBips: number
    newReserveRatioBips: number
    blockTimestamp: number
    transactionHash: string
  }[]
  maxTotalSupplyUpdateds: {
    oldMaxTotalSupply: string
    newMaxTotalSupply: string
    blockTimestamp: number
    transactionHash: string
  }[]
  fixedTermUpdateds: {
    oldFixedTermEndTime: number
    newFixedTermEndTime: number
    blockTimestamp: number
    transactionHash: string
  }[]
  minimumDepositUpdateds: {
    oldMinimumDeposit: string | null
    newMinimumDeposit: string
    blockTimestamp: number
    transactionHash: string
  }[]
}

// ============================================================
// TYPES — Component data shapes
// ============================================================

interface MarketInfo {
  address: string
  name: string
  borrower: string
  assetSymbol: string
  assetDecimals: number
  marketType: "Open-term" | "Fixed-term" | "Unknown"
  fixedTermEndTime: number | null
  status: "Healthy" | "Delinquent" | "Penalty" | "Closed"
  createdAt: Date
  currentAPR: number
  reserveRatioTarget: number
  reserveRatioActual: number
  penaltyAPR: number
  gracePeriodHours: number
  gracePeriodSeconds: number
  withdrawalCycleHours: number
  protocolFeePct: number
  totalDebt: number
  capacity: number
  utilizationPct: number
  activeLenders: number
  avgDeposit: number
  totalBorrowed: number
  totalRepaid: number
  totalDeposited: number
  totalBaseInterest: number
  totalDelinquencyFees: number
  totalProtocolFees: number
  scaleFactor: string
}

interface DailyDataPoint {
  date: string
  dateShort: string
  timestamp: number
  debt: number
  dailyDeposit: number
  dailyWithdrawal: number
  dailyWithdrawalNeg: number
  netFlow: number
  baseInterest: number
  delinquencyFees: number
  protocolFees: number
}

interface WithdrawalBatchData {
  id: string
  label: string
  requested: number
  paidAtExpiry: number
  shortfall: number
  status: "paid" | "paid-late" | "unpaid" | "pending"
  daysToClose: number | null
  lenderCount: number
}

interface DelinquencyEvent {
  id: number
  start: string
  end: string | null
  durationHours: number
  penalized: boolean
}

interface ParameterChange {
  date: string
  timestamp: number
  parameter: string
  oldValue: string
  newValue: string
  tx: string
}

interface LenderData {
  address: string
  firstDeposit: string
  totalDeposited: number
  balance: number
  interest: number
  pctOfMarket: number
}

interface TransferData {
  date: string
  from: string
  to: string
  amount: number
  tx: string
}

interface WithdrawalQueueData {
  pendingBatches: number
  totalQueued: number
  amountUnfilled: number
  lendersWaiting: number
  nextExpiry: string
}

interface WithdrawalHistoricalStats {
  totalBatches: number
  fullyPaidPct: number
  paidLateCount: number
  unpaidCount: number
  avgShortfallPct: number
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmheai1ym00jyx7p27qn46qtm/subgraphs/mainnet/v2.0.23/gn"
const DEFAULT_MARKET = "0xc9499006a149c553d18171747ed19aa7c6dd19e2"
const RAY = 10n ** 27n

const T = {
  bg: "#0a0e17",
  bgCard: "#111827",
  bgCardHover: "#1a2234",
  bgSkeleton: "#1e293b",
  border: "#1e293b",
  borderSubtle: "#162031",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#22d3ee",
  accentGreen: "#34d399",
  accentRed: "#f87171",
  accentAmber: "#fbbf24",
  accentPurple: "#a78bfa",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  fontBody: "'DM Sans', 'Satoshi', system-ui, sans-serif",
  radius: "10px",
  radiusSm: "6px",
} as const

function truncAddr(a: string): string {
  return a.length <= 13 ? a : `${a.slice(0, 6)}...${a.slice(-4)}`
}
function truncTx(h: string): string {
  return `${h.slice(0, 6)}...${h.slice(-4)}`
}
function toHuman(raw: string | bigint, decimals: number): number {
  return Number(typeof raw === "string" ? BigInt(raw) : raw) / 10 ** decimals
}
function normalizeScaled(scaled: string, sf: string): bigint {
  return (BigInt(scaled) * BigInt(sf)) / RAY
}
function fmtDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}
function fmtDateShort(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}
function fmtK(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return `${v}`
}

// ============================================================
// GENERIC SUBGRAPH QUERY + HOOK
// ============================================================

async function querySubgraph<T>(query: string): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    console.log(`---- SUBGRAPH ERROR -----`)
    console.log(query)
    console.log(res)
    throw new Error(`Subgraph HTTP ${res.status}`)
  }
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || "Subgraph error")
  return json.data as T
}

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null }

function useSubgraphQuery<T>(
  queryFn: () => Promise<T>,
  label: string,
  deps: any[] = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setState({ data: null, loading: true, error: null })
    queryFn()
      .then((data) => {
        if (mounted.current) setState({ data, loading: false, error: null })
      })
      .catch((e) => {
        console.error(`[${label}] Query failed:`, e)
        if (mounted.current)
          setState({
            data: null,
            loading: false,
            error: e.message || "Unknown error",
          })
      })
    return () => {
      mounted.current = false
    }
  }, deps)

  return state
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================

async function fetchMarket(addr: string): Promise<RawMarket> {
  const d = await querySubgraph<{ market: RawMarket }>(`{
    market(id: "${addr}") {
      id name symbol decimals borrower
      asset { symbol decimals address }
      hooks { kind }
      hooksConfig { fixedTermEndTime }
      annualInterestBips reserveRatioBips delinquencyGracePeriod delinquencyFeeBips
      withdrawalBatchDuration maxTotalSupply scaledTotalSupply scaleFactor
      isDelinquent isIncurringPenalties isClosed timeDelinquent protocolFeeBips
      totalBorrowed totalRepaid totalDeposited
      totalBaseInterestAccrued totalDelinquencyFeesAccrued totalProtocolFeesAccrued
      pendingProtocolFees normalizedUnclaimedWithdrawals createdAt
    }
  }`)
  return d.market
}

async function fetchLenders(addr: string): Promise<RawLenderAccount[]> {
  const d = await querySubgraph<{ lenderAccounts: RawLenderAccount[] }>(`{
    lenderAccounts(where: { market: "${addr}" }, orderBy: scaledBalance, orderDirection: desc, first: 100) {
      address scaledBalance totalDeposited totalInterestEarned addedTimestamp
    }
  }`)
  return d.lenderAccounts
}

async function fetchMarketAndLenders(
  addr: string,
): Promise<{ market: MarketInfo }> {
  const [raw, rawLenders] = await Promise.all([
    fetchMarket(addr),
    fetchLenders(addr),
  ])
  const dec = raw.asset.decimals
  const totalDebtRaw = normalizeScaled(raw.scaledTotalSupply, raw.scaleFactor)
  const totalDebt = toHuman(totalDebtRaw, dec)
  const capacity = toHuman(raw.maxTotalSupply, dec)
  const outstanding =
    toHuman(raw.totalBorrowed, dec) - toHuman(raw.totalRepaid, dec)
  const reserves =
    totalDebt -
    outstanding -
    toHuman(raw.pendingProtocolFees, dec) -
    toHuman(raw.normalizedUnclaimedWithdrawals, dec)
  const actLenders = rawLenders.filter(
    (l) => BigInt(l.scaledBalance) > 0n,
  ).length

  let status: MarketInfo["status"] = "Healthy"
  if (raw.isClosed) status = "Closed"
  else if (raw.isIncurringPenalties) status = "Penalty"
  else if (raw.isDelinquent) status = "Delinquent"

  let marketType: MarketInfo["marketType"] = "Unknown"
  if (raw.hooks?.kind === "OpenTerm") marketType = "Open-term"
  else if (raw.hooks?.kind === "FixedTerm") marketType = "Fixed-term"

  return {
    market: {
      address: raw.id,
      name: raw.name,
      borrower: raw.borrower,
      assetSymbol: raw.asset.symbol,
      assetDecimals: dec,
      marketType,
      fixedTermEndTime: raw.hooksConfig?.fixedTermEndTime ?? null,
      status,
      createdAt: new Date(raw.createdAt * 1000),
      currentAPR: raw.annualInterestBips / 100,
      reserveRatioTarget: raw.reserveRatioBips / 100,
      reserveRatioActual:
        totalDebt > 0 ? Math.max(0, (reserves / totalDebt) * 100) : 0,
      penaltyAPR: raw.delinquencyFeeBips / 100,
      gracePeriodHours: Math.round(raw.delinquencyGracePeriod / 3600),
      gracePeriodSeconds: raw.delinquencyGracePeriod,
      withdrawalCycleHours: Math.round(raw.withdrawalBatchDuration / 3600),
      protocolFeePct: raw.protocolFeeBips / 100,
      totalDebt,
      capacity,
      utilizationPct: capacity > 0 ? (totalDebt / capacity) * 100 : 0,
      activeLenders: actLenders,
      avgDeposit: actLenders > 0 ? totalDebt / actLenders : 0,
      totalBorrowed: toHuman(raw.totalBorrowed, dec),
      totalRepaid: toHuman(raw.totalRepaid, dec),
      totalDeposited: toHuman(raw.totalDeposited, dec),
      totalBaseInterest: toHuman(raw.totalBaseInterestAccrued, dec),
      totalDelinquencyFees: toHuman(raw.totalDelinquencyFeesAccrued, dec),
      totalProtocolFees: toHuman(raw.totalProtocolFeesAccrued, dec),
      scaleFactor: raw.scaleFactor,
    },
  }
}

async function fetchDailyData(
  addr: string,
  dec: number,
): Promise<DailyDataPoint[]> {

  console.log(`QUERY: {
      marketDailyStats_collection(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: asc, first: 1000) {
        baseInterestAccrued delinquencyFeesAccrued protocolFeesAccrued blockTimestamp
      }
    }
      
    
    {
      marketDailyStats_collection(where: { market: "${addr}" }, orderBy: startTimestamp, orderDirection: asc, first: 1000) {
        startTimestamp totalDeposited totalWithdrawalsRequested totalWithdrawalsExecuted totalBorrowed totalRepaid
      }
    }`)
  const [rawDaily, rawInterest] = await Promise.all([
    querySubgraph<{ marketDailyStats_collection: RawMarketDailyStats[] }>(`{
      marketDailyStats_collection(where: { market: "${addr}" }, orderBy: startTimestamp, orderDirection: asc, first: 1000) {
        startTimestamp totalDeposited totalWithdrawalsRequested totalWithdrawalsExecuted totalBorrowed totalRepaid
      }
    }`).then((d) => d.marketDailyStats_collection),
    querySubgraph<{ marketInterestAccrueds: RawMarketInterestAccrued[] }>(`{
      marketInterestAccrueds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: asc, first: 1000) {
        baseInterestAccrued delinquencyFeesAccrued protocolFeesAccrued blockTimestamp
      }
    }`).then((d) => d.marketInterestAccrueds),
  ])

  const interestByDay = new Map<
    string,
    { base: number; delinq: number; proto: number }
  >()
  for (const evt of rawInterest) {
    const day = fmtDate(evt.blockTimestamp)
    const p = interestByDay.get(day) || { base: 0, delinq: 0, proto: 0 }
    p.base += toHuman(evt.baseInterestAccrued, dec)
    p.delinq += toHuman(evt.delinquencyFeesAccrued, dec)
    p.proto += toHuman(evt.protocolFeesAccrued, dec)
    interestByDay.set(day, p)
  }

  let cumDep = 0
  let cumWd = 0
  let cumBase = 0
  let cumDelinq = 0
  let cumProto = 0
  return rawDaily.map((ds) => {
    const dep = toHuman(ds.totalDeposited, dec)
    const wd = toHuman(ds.totalWithdrawalsRequested, dec)
    cumDep += dep
    cumWd += wd
    const day = fmtDate(ds.startTimestamp)
    const di = interestByDay.get(day)
    if (di) {
      cumBase += di.base
      cumDelinq += di.delinq
      cumProto += di.proto
    }
    const debt = ds.totalDebt
      ? toHuman(ds.totalDebt, dec)
      : Math.max(0, cumDep - cumWd)
    return {
      date: day,
      dateShort: fmtDateShort(ds.startTimestamp),
      timestamp: ds.startTimestamp,
      debt,
      dailyDeposit: dep,
      dailyWithdrawal: wd,
      dailyWithdrawalNeg: -wd,
      netFlow: cumDep - cumWd,
      baseInterest: cumBase,
      delinquencyFees: cumDelinq,
      protocolFees: cumProto,
    }
  })
}

async function fetchParamChanges(
  addr: string,
  dec: number,
): Promise<ParameterChange[]> {
  const raw = await querySubgraph<RawParameterChanges>(`{
    annualInterestBipsUpdateds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { oldAnnualInterestBips newAnnualInterestBips blockTimestamp transactionHash }
    reserveRatioBipsUpdateds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { oldReserveRatioBips newReserveRatioBips blockTimestamp transactionHash }
    maxTotalSupplyUpdateds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { oldMaxTotalSupply newMaxTotalSupply blockTimestamp transactionHash }
    fixedTermUpdateds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { oldFixedTermEndTime newFixedTermEndTime blockTimestamp transactionHash }
    minimumDepositUpdateds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { oldMinimumDeposit newMinimumDeposit blockTimestamp transactionHash }
  }`)
  const ch: ParameterChange[] = []
  raw.annualInterestBipsUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      parameter: "Annual Interest",
      oldValue: `${(e.oldAnnualInterestBips / 100).toFixed(2)}%`,
      newValue: `${(e.newAnnualInterestBips / 100).toFixed(2)}%`,
      tx: truncTx(e.transactionHash),
    })
  })
  raw.reserveRatioBipsUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      parameter: "Reserve Ratio",
      oldValue: `${(e.oldReserveRatioBips / 100).toFixed(1)}%`,
      newValue: `${(e.newReserveRatioBips / 100).toFixed(1)}%`,
      tx: truncTx(e.transactionHash),
    })
  })
  raw.maxTotalSupplyUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      parameter: "Max Capacity",
      oldValue: fmtUSD(toHuman(e.oldMaxTotalSupply, dec)),
      newValue: fmtUSD(toHuman(e.newMaxTotalSupply, dec)),
      tx: truncTx(e.transactionHash),
    })
  })

  raw.fixedTermUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      parameter: "Fixed Term End",
      oldValue: fmtDate(e.oldFixedTermEndTime),
      newValue: fmtDate(e.newFixedTermEndTime),
      tx: truncTx(e.transactionHash),
    })
  })

  raw.minimumDepositUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      parameter: "Min Deposit",
      oldValue: e.oldMinimumDeposit
        ? fmtUSD(toHuman(e.oldMinimumDeposit, dec))
        : "—",
      newValue: fmtUSD(toHuman(e.newMinimumDeposit, dec)),
      tx: truncTx(e.transactionHash),
    })
  })

  ch.sort((a, b) => b.timestamp - a.timestamp)
  return ch
}

async function fetchDelinquency(
  addr: string,
  gracePeriodSec: number,
): Promise<DelinquencyEvent[]> {
  const raw = await querySubgraph<{
    delinquencyStatusChangeds: RawDelinquencyEvent[]
  }>(`{
    delinquencyStatusChangeds(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: asc, first: 1000) {
      isDelinquent blockTimestamp liquidityCoverageRequired totalAssets
    }
  }`).then((d) => d.delinquencyStatusChangeds)
  const events: DelinquencyEvent[] = []
  let open: { ts: number; idx: number } | null = null
  raw.forEach((evt) => {
    if (evt.isDelinquent) {
      open = { ts: evt.blockTimestamp, idx: events.length + 1 }
    } else if (open) {
      const dur = evt.blockTimestamp - open.ts
      events.push({
        id: open.idx,
        start: fmtDate(open.ts),
        end: fmtDate(evt.blockTimestamp),
        durationHours: Math.round(dur / 3600),
        penalized: dur > gracePeriodSec,
      })
      open = null
    }
  })
  if (open) {
    const now = Math.floor(Date.now() / 1000)
    events.push({
      id: open.idx,
      start: fmtDate(open.ts),
      end: null,
      durationHours: Math.round((now - open.ts) / 3600),
      penalized: now - open.ts > gracePeriodSec,
    })
  }
  return events
}

interface BatchResults {
  batches: WithdrawalBatchData[]
  queue: WithdrawalQueueData
  stats: WithdrawalHistoricalStats
}

async function fetchBatches(addr: string, dec: number): Promise<BatchResults> {
  const raw = await querySubgraph<{
    withdrawalBatches: RawWithdrawalBatch[]
  }>(`{
    withdrawalBatches(where: { market: "${addr}" }, orderBy: expiry, orderDirection: asc, first: 100) {
      id expiry scaledTotalAmount scaledAmountBurned normalizedAmountPaid totalNormalizedRequests
      isExpired isClosed lenderWithdrawalsCount
      creation { blockTimestamp }
      expiration { normalizedAmountPaid normalizedAmountOwed blockTimestamp }
    }
  }`).then((d) => d.withdrawalBatches)

  const expired: WithdrawalBatchData[] = []
  let pBatches = 0
  let tQueued = 0
  let aUnfilled = 0
  let lWaiting = 0
  let nExpiry = Infinity

  raw.forEach((b) => {
    const requested = toHuman(b.totalNormalizedRequests, dec)
    if (!b.isExpired && !b.isClosed) {
      pBatches += 1
      tQueued += requested
      aUnfilled += requested - toHuman(b.normalizedAmountPaid, dec)
      lWaiting += b.lenderWithdrawalsCount
      const exp = Number(b.expiry)
      if (exp < nExpiry) nExpiry = exp
      return
    }
    let paidAtExpiry = requested
    let shortfall = 0
    if (b.expiration) {
      paidAtExpiry = toHuman(b.expiration.normalizedAmountPaid, dec)
      shortfall = toHuman(b.expiration.normalizedAmountOwed, dec)
    }
    let status: WithdrawalBatchData["status"] = "paid"
    let daysToClose: number | null = null
    if (shortfall > 0.01) {
      if (b.isClosed) {
        status = "paid-late"
        daysToClose = b.expiration
          ? Math.max(
              1,
              Math.round(
                Math.abs(
                  Math.floor(Date.now() / 1000) - b.expiration.blockTimestamp,
                ) / 86400,
              ),
            )
          : null
        if (daysToClose && daysToClose > 60) daysToClose = null
      } else {
        status = "unpaid"
      }
    }
    expired.push({
      id: b.id,
      label: `#${expired.length + 1}`,
      requested,
      paidAtExpiry,
      shortfall,
      status,
      daysToClose,
      lenderCount: b.lenderWithdrawalsCount,
    })
  })

  const total = expired.length
  const paidFull = expired.filter((b) => b.status === "paid").length
  const underpaid = expired.filter((b) => b.shortfall > 0.01)
  return {
    batches: expired,
    queue: {
      pendingBatches: pBatches,
      totalQueued: tQueued,
      amountUnfilled: aUnfilled,
      lendersWaiting: lWaiting,
      nextExpiry:
        nExpiry < Infinity
          ? `${Math.max(0, Math.round((nExpiry - Date.now() / 1000) / 3600))}h`
          : "—",
    },
    stats: {
      totalBatches: total,
      fullyPaidPct: total > 0 ? Math.round((paidFull / total) * 100) : 100,
      paidLateCount: expired.filter((b) => b.status === "paid-late").length,
      unpaidCount: expired.filter((b) => b.status === "unpaid").length,
      avgShortfallPct:
        underpaid.length > 0
          ? Math.round(
              underpaid.reduce(
                (s, b) => s + (b.shortfall / b.requested) * 100,
                0,
              ) / underpaid.length,
            )
          : 0,
    },
  }
}

async function fetchLenderTable(
  addr: string,
  sf: string,
  dec: number,
  totalDebt: number,
): Promise<LenderData[]> {
  const raw = await fetchLenders(addr)
  return raw
    .filter((l) => BigInt(l.scaledBalance) > 0n)
    .map((l) => {
      const bal = toHuman(normalizeScaled(l.scaledBalance, sf), dec)
      return {
        address: truncAddr(l.address),
        firstDeposit: fmtDate(l.addedTimestamp),
        totalDeposited: toHuman(l.totalDeposited, dec),
        balance: bal,
        interest: toHuman(l.totalInterestEarned, dec),
        pctOfMarket: totalDebt > 0 ? (bal / totalDebt) * 100 : 0,
      }
    })
    .sort((a, b) => b.balance - a.balance)
}

async function fetchTransferData(
  addr: string,
  dec: number,
): Promise<TransferData[]> {
  const raw = await querySubgraph<{ transfers: RawTransfer[] }>(`{
    transfers(where: { market: "${addr}" }, orderBy: blockTimestamp, orderDirection: desc, first: 50) {
      from { address } to { address } amount blockTimestamp transactionHash
    }
  }`).then((d) => d.transfers)
  return raw.map((t) => ({
    date: fmtDate(t.blockTimestamp),
    from: truncAddr(t.from.address),
    to: truncAddr(t.to.address),
    amount: toHuman(t.amount, dec),
    tx: truncTx(t.transactionHash),
  }))
}

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

const axisStyle = { fontFamily: T.fontMono, fontSize: 10, fill: T.textDim }
const gridStyle = { stroke: T.borderSubtle, strokeDasharray: "3 3" }

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ name: string; color: string; value: number }>
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: "#1a2234ee",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: "10px 14px",
        fontFamily: T.fontMono,
        fontSize: "11px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ color: T.textMuted, marginBottom: "6px" }}>{label}</div>
      {payload.map((p, i) => (
        <div
          // key={i.toString()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "2px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "2px",
              background: p.color,
            }}
          />
          <span style={{ color: T.textDim }}>{p.name}:</span>
          <span style={{ color: T.text, fontWeight: 600 }}>
            {fmtUSD(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  subtitle,
  accent,
  warn,
  small,
}: {
  label: string
  value: string
  subtitle?: string
  accent?: boolean
  warn?: boolean
  small?: boolean
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${warn ? `${T.accentAmber}40` : T.border}`,
        borderRadius: T.radius,
        padding: small ? "14px 18px" : "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: T.fontBody,
          fontSize: small ? "11px" : "12px",
          fontWeight: 500,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: small ? "20px" : "26px",
          fontWeight: 600,
          color: warn ? T.accentAmber : accent ? T.accent : T.text,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {subtitle && (
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "11px",
            color: T.textMuted,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div style={{ padding: "8px 0 4px 0" }}>
      <h2
        style={{
          fontFamily: T.fontBody,
          fontSize: "16px",
          fontWeight: 600,
          color: T.text,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontFamily: T.fontBody,
            fontSize: "12px",
            color: T.textDim,
            margin: "2px 0 0 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
  height = 280,
  fullWidth,
  timeRange,
  onTimeRangeChange,
}: {
  title: string
  description?: string
  children: React.ReactNode
  height?: number
  fullWidth?: boolean
  timeRange?: string
  onTimeRangeChange?: (r: string) => void
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "20px 24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "14px",
              fontWeight: 600,
              color: T.text,
            }}
          >
            {title}
          </span>
          {description && (
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                color: T.textDim,
                maxWidth: "460px",
              }}
            >
              {description}
            </span>
          )}
        </div>
        {timeRange !== undefined && (
          <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
            {["7d", "30d", "90d", "1y", "All"].map((r) => (
              <span
                key={r}
                onClick={() => onTimeRangeChange?.(r)}
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "10px",
                  color: timeRange === r ? T.accent : T.textDim,
                  background: timeRange === r ? `${T.accent}18` : "transparent",
                  padding: "3px 7px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  )
}

// --- Skeleton & Error ---

function SectionSkeleton({
  height = 200,
  label,
}: {
  height?: number
  label?: string
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "20px 24px",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: "12px",
          color: T.textDim,
          opacity: 0.5,
        }}
      >
        {label || "Loading..."}
      </span>
    </div>
  )
}

function SectionError({ label, error }: { label: string; error: string }) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.accentRed}30`,
        borderRadius: T.radius,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: "14px",
          color: T.accentRed,
          opacity: 0.6,
        }}
      >
        ✕
      </span>
      <div>
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.textMuted,
          }}
        >
          {label}:
        </span>
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: "11px",
            color: T.textDim,
            marginLeft: "8px",
          }}
        >
          {error}
        </span>
      </div>
    </div>
  )
}

function useTimeRange(data: DailyDataPoint[]) {
  const [range, setRange] = useState("All")
  const filtered = useMemo(() => {
    const d: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
      All: 99999,
    }
    return data.slice(-(d[range] ?? 99999))
  }, [data, range])
  return {
    filtered,
    range,
    setRange,
    tickInterval: Math.max(1, Math.floor(filtered.length / 12)),
  }
}

// ============================================================
// SECTION COMPONENTS (each fetches its own data)
// ============================================================

function MarketHeaderSection({ addr }: { addr: string }) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchMarketAndLenders(addr),
    "MarketHeader",
    [addr],
  )
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={220} label="Loading market info..." />
        <SectionSkeleton height={220} />
      </div>
    )
  if (error || !data)
    return <SectionError label="Market info" error={error || "No data"} />
  const m = data.market
  const sc: Record<string, string> = {
    Healthy: T.accentGreen,
    Delinquent: T.accentAmber,
    Penalty: T.accentRed,
    Closed: T.textDim,
  }
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "22px",
              fontWeight: 700,
              color: T.text,
              letterSpacing: "-0.02em",
            }}
          >
            {m.name}
          </span>
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: "10px",
              fontWeight: 600,
              color: sc[m.status] || T.textDim,
              background: `${sc[m.status] || T.textDim}18`,
              padding: "3px 10px",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {m.status}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { l: "Borrower", v: `${truncAddr(m.borrower)} →`, link: true },
            { l: "Asset", v: m.assetSymbol },
            { l: "Market Type", v: m.marketType },
            { l: "Created", v: m.createdAt.toLocaleDateString() },
          ].map((r) => (
            <div
              key={r.l}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {r.l}
              </span>
              <span
                style={{
                  fontFamily: r.link ? T.fontMono : T.fontBody,
                  fontSize: "13px",
                  color: r.link ? T.accent : T.text,
                  cursor: r.link ? "pointer" : "default",
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <StatCard small label="Total Debt" value={fmtUSD(m.totalDebt)} accent />
        <StatCard
          small
          label="Capacity"
          value={fmtUSD(m.capacity)}
          subtitle={`${m.utilizationPct.toFixed(1)}% utilized`}
        />
        <StatCard
          small
          label="Current APR"
          value={`${m.currentAPR.toFixed(2)}%`}
          accent
        />
        <StatCard
          small
          label="Reserve Ratio"
          value={`${m.reserveRatioActual.toFixed(
            0,
          )}% / ${m.reserveRatioTarget.toFixed(0)}%`}
          subtitle="actual / target"
        />
        <StatCard
          small
          label="Penalty APR"
          value={`${m.penaltyAPR.toFixed(2)}%`}
          subtitle={`grace: ${m.gracePeriodHours}h`}
        />
        <StatCard
          small
          label="Withdrawal Cycle"
          value={`${m.withdrawalCycleHours}h`}
        />
        <StatCard small label="Active Lenders" value={`${m.activeLenders}`} />
        <StatCard
          small
          label="Protocol Fee"
          value={`${m.protocolFeePct.toFixed(2)}%`}
        />
        <StatCard
          small
          label="Avg Deposit"
          value={fmtUSD(m.avgDeposit)}
          subtitle="per lender position"
        />
      </div>
    </div>
  )
}

function DebtChartSection({
  addr,
  dec,
  paramChanges,
}: {
  addr: string
  dec: number
  paramChanges: ParameterChange[] | null
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "DebtChart",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return <SectionSkeleton height={380} label="Loading daily stats..." />
  if (error || !data?.length)
    return (
      <SectionError label="Debt over time" error={error || "No daily data"} />
    )
  const refLines = (paramChanges || [])
    .map((c) => ({
      dateShort: fmtDateShort(c.timestamp),
      label: c.parameter
        .replace("Annual Interest", "APR")
        .replace("Max Capacity", "Cap ↑"),
    }))
    .filter((r) => filtered.some((d) => d.dateShort === r.dateShort))
  return (
    <ChartCard
      title="Total Debt Over Time"
      description="Market size trajectory · dashed lines mark parameter changes"
      height={300}
      fullWidth
      timeRange={range}
      onTimeRangeChange={setRange}
    >
      <ResponsiveContainer>
        <AreaChart
          data={filtered}
          margin={{ top: 10, right: 16, bottom: 0, left: 8 }}
        >
          <defs>
            <linearGradient id="dG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={T.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey="dateShort"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtK}
            width={52}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="debt"
            stroke={T.accent}
            strokeWidth={2}
            fill="url(#dG)"
            name="Total Debt"
          />
          {refLines.map((r, i) => (
            <ReferenceLine
              key={i}
              x={r.dateShort}
              stroke={T.accentAmber}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: r.label,
                position: "top",
                fill: T.accentAmber,
                fontSize: 10,
                fontFamily: T.fontMono,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ParameterHistorySection({
  addr,
  dec,
}: {
  addr: string
  dec: number
  onLoaded?: (c: ParameterChange[]) => void
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchParamChanges(addr, dec),
    "ParamHistory",
    [addr, dec],
  )
  if (loading)
    return <SectionSkeleton height={120} label="Loading parameter history..." />
  if (error) return <SectionError label="Parameter history" error={error} />
  const changes = data || []
  const cols = ["Date", "Parameter", "Old Value", "New Value", "Tx"]
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr 130px 130px 120px",
          padding: "12px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: `${T.bgSkeleton}60`,
        }}
      >
        {cols.map((c) => (
          <span
            key={c}
            style={{
              fontFamily: T.fontBody,
              fontSize: "11px",
              fontWeight: 600,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {c}
          </span>
        ))}
      </div>
      {changes.length === 0 ? (
        <div
          style={{
            padding: "20px 24px",
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.accentGreen,
          }}
        >
          No parameter changes since market creation
        </div>
      ) : (
        changes.map((ch, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 130px 130px 120px",
              padding: "14px 24px",
              borderBottom:
                i < changes.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {ch.date}
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "13px",
                color: T.text,
              }}
            >
              {ch.parameter}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentRed,
              }}
            >
              {ch.oldValue}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentGreen,
              }}
            >
              {ch.newValue}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "11px",
                color: T.accent,
                cursor: "pointer",
              }}
            >
              {ch.tx}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

function DepositsWithdrawalsSection({
  addr,
  dec,
}: {
  addr: string
  dec: number
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "DepWd",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={320} label="Loading deposits..." />
        <SectionSkeleton height={320} />
      </div>
    )
  if (error || !data?.length)
    return (
      <SectionError label="Deposits & Withdrawals" error={error || "No data"} />
    )
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Daily Deposits & Withdrawals"
        description="Deposits above axis · withdrawals below"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <ComposedChart
            data={filtered}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="dateShort"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtK}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="dailyDeposit"
              fill={T.accentGreen}
              opacity={0.8}
              name="Deposits"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="dailyWithdrawalNeg"
              fill={T.accentRed}
              opacity={0.8}
              name="Withdrawals"
              radius={[0, 0, 2, 2]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Cumulative Net Flow"
        description="Running total: deposits − withdrawals"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <AreaChart
            data={filtered}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="nfG" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={T.accentGreen}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={T.accentGreen}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="dateShort"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtK}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="netFlow"
              stroke={T.accentGreen}
              strokeWidth={2}
              fill="url(#nfG)"
              name="Net Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function DelinquencySection({
  addr,
  gracePeriodSec,
  gracePeriodHours,
}: {
  addr: string
  gracePeriodSec: number
  gracePeriodHours: number
}) {
  const {
    data: events,
    loading,
    error,
  } = useSubgraphQuery(
    () => fetchDelinquency(addr, gracePeriodSec),
    "Delinquency",
    [addr],
  )
  if (loading)
    return <SectionSkeleton height={200} label="Loading delinquency..." />
  if (error) return <SectionError label="Delinquency history" error={error} />
  const evts = events || []
  const maxDur =
    evts.length > 0 ? Math.max(...evts.map((e) => e.durationHours)) : 1
  const avgCure =
    evts.length > 0
      ? Math.round(evts.reduce((s, e) => s + e.durationHours, 0) / evts.length)
      : 0
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Total Events"
          value={`${evts.length}`}
          subtitle="delinquency entries"
        />
        <StatCard
          small
          label="Longest"
          value={
            evts.length
              ? `${Math.max(...evts.map((e) => e.durationHours))}h`
              : "—"
          }
          subtitle="single event"
        />
        <StatCard
          small
          label="Avg Time to Cure"
          value={evts.length ? `${avgCure}h` : "—"}
        />
        <StatCard
          small
          label="Penalty Events"
          value={`${evts.filter((e) => e.penalized).length}`}
          subtitle="exceeded grace period"
        />
        <StatCard
          small
          label="Current Status"
          value={evts.some((e) => !e.end) ? "DELINQUENT" : "OK"}
          warn={evts.some((e) => !e.end)}
          subtitle={evts.some((e) => !e.end) ? "active now" : "not delinquent"}
        />
      </div>
      {evts.length > 0 ? (
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "20px 24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "14px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              Delinquency Timeline
            </span>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                color: T.textDim,
                marginLeft: "12px",
              }}
            >
              <span style={{ color: T.accentAmber }}>orange</span> = within
              grace · <span style={{ color: T.accentRed }}>red</span> =
              penalties
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {evts.map((evt) => (
              <div
                key={evt.id}
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: "11px",
                    color: T.textDim,
                    width: "90px",
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {evt.start.slice(5)}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "22px",
                    background: T.bgSkeleton,
                    borderRadius: "4px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.max(
                        5,
                        (evt.durationHours / maxDur) * 100,
                      )}%`,
                      background: evt.penalized
                        ? `linear-gradient(90deg, ${T.accentAmber} 0%, ${
                            T.accentAmber
                          } ${Math.min(
                            100,
                            (gracePeriodHours / evt.durationHours) * 100,
                          )}%, ${T.accentRed} ${Math.min(
                            100,
                            (gracePeriodHours / evt.durationHours) * 100,
                          )}%, ${T.accentRed} 100%)`
                        : T.accentAmber,
                      borderRadius: "4px",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: "11px",
                    color: evt.penalized ? T.accentRed : T.accentAmber,
                    width: "50px",
                    flexShrink: 0,
                  }}
                >
                  {evt.durationHours}h{!evt.end ? " ⟳" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "20px 24px",
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.accentGreen,
          }}
        >
          This market has never been delinquent.
        </div>
      )}
    </div>
  )
}

function WithdrawalBatchSection({ addr, dec }: { addr: string; dec: number }) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchBatches(addr, dec),
    "Batches",
    [addr, dec],
  )
  if (loading)
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
      >
        <SectionSkeleton height={340} label="Loading batches..." />
        <SectionSkeleton height={340} />
      </div>
    )
  if (error || !data)
    return (
      <SectionError label="Withdrawal batches" error={error || "No data"} />
    )
  const { batches, queue, stats } = data
  const bc: Record<string, string> = {
    paid: T.accentGreen,
    "paid-late": T.accentAmber,
    unpaid: T.accentRed,
    pending: T.textDim,
  }
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Withdrawal Batch History"
        description="Green = paid at expiry · Amber = paid late (hover for close time) · Red = still unpaid"
        height={260}
      >
        {batches.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No expired batches yet
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart
              data={batches}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...gridStyle} />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtK}
                width={48}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const b = batches.find((x) => x.label === label)
                  if (!b) return null
                  return (
                    <div
                      style={{
                        background: "#1a2234ee",
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radiusSm,
                        padding: "10px 14px",
                        fontFamily: T.fontMono,
                        fontSize: "11px",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div style={{ color: T.textMuted, marginBottom: "6px" }}>
                        Batch {label}
                      </div>
                      <div style={{ color: T.text }}>
                        Requested: {fmtUSD(b.requested)}
                      </div>
                      <div style={{ color: T.accentGreen }}>
                        Paid at expiry: {fmtUSD(b.paidAtExpiry)}
                      </div>
                      {b.shortfall > 0.01 && (
                        <div style={{ color: bc[b.status] }}>
                          Shortfall: {fmtUSD(b.shortfall)} (
                          {Math.round((b.shortfall / b.requested) * 100)}%)
                        </div>
                      )}
                      {b.status === "paid-late" && b.daysToClose && (
                        <div style={{ color: T.accentAmber }}>
                          Closed after {b.daysToClose}d
                        </div>
                      )}
                      {b.status === "unpaid" && (
                        <div style={{ color: T.accentRed }}>Still unpaid</div>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="paidAtExpiry" stackId="a" name="Paid">
                {batches.map((b, i) => (
                  <Cell
                    key={i}
                    fill={bc[b.status]}
                    opacity={b.status === "paid" ? 0.8 : 0.5}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="shortfall"
                stackId="a"
                name="Shortfall"
                radius={[2, 2, 0, 0]}
              >
                {batches.map((b, i) => (
                  <Cell
                    key={i}
                    fill={b.status === "unpaid" ? T.accentRed : T.accentAmber}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "14px",
              fontWeight: 600,
              color: T.text,
            }}
          >
            Current Queue
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { l: "Pending batches", v: `${queue.pendingBatches}` },
            { l: "Total queued", v: fmtUSD(queue.totalQueued) },
            { l: "Amount unfilled", v: fmtUSD(queue.amountUnfilled) },
            { l: "Lenders waiting", v: `${queue.lendersWaiting}` },
            { l: "Next expiry", v: queue.nextExpiry },
          ].map((r) => (
            <div
              key={r.l}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.textDim,
                }}
              >
                {r.l}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: T.text,
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "11px",
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Historical
          </span>
          {[
            { l: "Total batches", v: `${stats.totalBatches}` },
            { l: "Fully paid at expiry", v: `${stats.fullyPaidPct}%` },
            { l: "Paid late", v: `${stats.paidLateCount}` },
            { l: "Still unpaid", v: `${stats.unpaidCount}` },
            { l: "Avg shortfall", v: `${stats.avgShortfallPct}%` },
          ].map((r) => (
            <div
              key={r.l}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.textDim,
                }}
              >
                {r.l}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "13px",
                  color: T.text,
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InterestSection({
  addr,
  dec,
  market,
}: {
  addr: string
  dec: number
  market: MarketInfo | null
}) {
  const { data, loading, error } = useSubgraphQuery(
    () => fetchDailyData(addr, dec),
    "Interest",
    [addr, dec],
  )
  const { filtered, range, setRange, tickInterval } = useTimeRange(data || [])
  if (loading || !market)
    return <SectionSkeleton height={320} label="Loading interest data..." />
  if (error || !data?.length)
    return (
      <SectionError label="Interest breakdown" error={error || "No data"} />
    )
  const totalCost =
    market.totalBaseInterest +
    market.totalDelinquencyFees +
    market.totalProtocolFees
  const ageYears =
    (Date.now() - market.createdAt.getTime()) / (365.25 * 86400 * 1000)
  const effectiveCost =
    ageYears > 0 && market.totalDebt > 0
      ? `${((totalCost / ageYears / market.totalDebt) * 100).toFixed(2)}%`
      : "—"
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}
    >
      <ChartCard
        title="Cumulative Interest Breakdown"
        description="Base interest + penalty fees (to lenders) + protocol fees"
        height={240}
        timeRange={range}
        onTimeRangeChange={setRange}
      >
        <ResponsiveContainer>
          <AreaChart
            data={filtered}
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accentGreen} stopOpacity={0.3} />
                <stop
                  offset="95%"
                  stopColor={T.accentGreen}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id="dlG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accentAmber} stopOpacity={0.3} />
                <stop
                  offset="95%"
                  stopColor={T.accentAmber}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={T.accentPurple}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={T.accentPurple}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="dateShort"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtK}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="baseInterest"
              stackId="1"
              stroke={T.accentGreen}
              fill="url(#bG)"
              name="Base Interest"
            />
            <Area
              type="monotone"
              dataKey="delinquencyFees"
              stackId="1"
              stroke={T.accentAmber}
              fill="url(#dlG)"
              name="Penalty Fees"
            />
            <Area
              type="monotone"
              dataKey="protocolFees"
              stackId="1"
              stroke={T.accentPurple}
              fill="url(#pG)"
              name="Protocol Fees"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <div
        style={{
          display: "grid",
          gridTemplateRows: "1fr 1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Interest to Lenders"
          value={fmtUSD(market.totalBaseInterest)}
          subtitle="base interest"
        />
        <StatCard
          small
          label="Total Penalty Fees"
          value={fmtUSD(market.totalDelinquencyFees)}
          warn
          subtitle="delinquency fees to lenders"
        />
        <StatCard
          small
          label="Protocol Fees"
          value={fmtUSD(market.totalProtocolFees)}
          subtitle="total accrued"
        />
        <StatCard
          small
          label="Effective Borrower Cost"
          value={effectiveCost}
          accent
          subtitle="annualized, all-in"
        />
      </div>
    </div>
  )
}

function TransferSection({ addr, dec }: { addr: string; dec: number }) {
  const {
    data: transfers,
    loading,
    error,
  } = useSubgraphQuery(() => fetchTransferData(addr, dec), "Transfers", [
    addr,
    dec,
  ])
  if (loading)
    return <SectionSkeleton height={200} label="Loading transfers..." />
  if (error) return <SectionError label="Transfers" error={error} />
  const tx = transfers || []
  const totalVol = tx.reduce((s, t) => s + t.amount, 0)
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "12px",
        alignItems: "start",
      }}
    >
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 1fr 110px 110px",
            padding: "12px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: `${T.bgSkeleton}60`,
          }}
        >
          {["Date", "From", "To", "Amount", "Tx"].map((c) => (
            <span
              key={c}
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                fontWeight: 600,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {tx.length === 0 ? (
          <div
            style={{
              padding: "20px 24px",
              fontFamily: T.fontBody,
              fontSize: "13px",
              color: T.textDim,
            }}
          >
            No token transfers recorded.
          </div>
        ) : (
          tx.map((t, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr 110px 110px",
                padding: "14px 24px",
                borderBottom:
                  i < tx.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.textMuted,
                }}
              >
                {t.date}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.from}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.to}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.text,
                }}
              >
                {fmtUSD(t.amount)}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "11px",
                  color: T.accent,
                  cursor: "pointer",
                }}
              >
                {t.tx}
              </span>
            </div>
          ))
        )}
      </div>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px 24px",
          minWidth: "200px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "11px",
            fontWeight: 600,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Transfer Summary
        </span>
        {[
          { l: "Total transfers", v: `${tx.length}` },
          { l: "Total volume", v: fmtUSD(totalVol) },
          { l: "Unique senders", v: `${new Set(tx.map((t) => t.from)).size}` },
          { l: "Unique receivers", v: `${new Set(tx.map((t) => t.to)).size}` },
        ].map((r) => (
          <div
            key={r.l}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "12px",
                color: T.textDim,
              }}
            >
              {r.l}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "14px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LenderTableSection({
  addr,
  sf,
  dec,
  totalDebt,
}: {
  addr: string
  sf: string
  dec: number
  totalDebt: number
}) {
  const {
    data: lenders,
    loading,
    error,
  } = useSubgraphQuery(
    () => fetchLenderTable(addr, sf, dec, totalDebt),
    "Lenders",
    [addr, sf, dec, totalDebt],
  )
  if (loading)
    return <SectionSkeleton height={300} label="Loading lenders..." />
  if (error) return <SectionError label="Lenders" error={error} />
  const ls = lenders || []
  const top1 = ls[0]?.pctOfMarket || 0
  const top3 = ls.slice(0, 3).reduce((s, l) => s + l.pctOfMarket, 0)
  const hhi = Math.round(ls.reduce((s, l) => s + l.pctOfMarket ** 2, 0))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        <StatCard
          small
          label="Top Lender"
          value={`${top1.toFixed(1)}%`}
          subtitle="share of total debt"
        />
        <StatCard
          small
          label="Top 3 Lenders"
          value={`${top3.toFixed(1)}%`}
          subtitle="combined share"
        />
        <StatCard
          small
          label="Lender HHI"
          value={`${hhi}`}
          subtitle="0 = dispersed · 10000 = single lender"
        />
      </div>
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 120px 130px 130px 130px 100px",
            padding: "12px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: `${T.bgSkeleton}60`,
          }}
        >
          {[
            "Lender",
            "First Deposit",
            "Total Deposited",
            "Current Balance",
            "Interest Earned",
            "% of Market",
          ].map((c) => (
            <span
              key={c}
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                fontWeight: 600,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {ls.map((l, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 120px 130px 130px 130px 100px",
              padding: "14px 24px",
              borderBottom:
                i < ls.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.background =
                T.bgCardHover
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.background =
                "transparent"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                }}
              >
                {l.address}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "12px",
                  color: T.accent,
                  opacity: 0.5,
                }}
              >
                →
              </span>
            </div>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {l.firstDeposit}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
              }}
            >
              {fmtUSD(l.totalDeposited)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.text,
                fontWeight: 600,
              }}
            >
              {fmtUSD(l.balance)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.accentGreen,
              }}
            >
              {fmtUSD(l.interest)}
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: "12px",
                color: T.textMuted,
              }}
            >
              {l.pctOfMarket.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          fontFamily: T.fontBody,
          fontSize: "11px",
          color: T.textDim,
          padding: "0 4px",
        }}
      >
        Sorted by current balance descending · click any row to view lender
        portfolio
      </div>
    </div>
  )
}

// ============================================================
// PAGE — orchestrates sections, passes shared context down
// ============================================================

export default function MarketDetailPage({
  marketAddress = DEFAULT_MARKET,
}: {
  marketAddress?: string
}) {
  const addr = marketAddress.toLowerCase()

  // Market header loads first — other sections depend on assetDecimals, scaleFactor, etc.
  const headerState = useSubgraphQuery(
    () => fetchMarketAndLenders(addr),
    "MarketCore",
    [addr],
  )
  const m = headerState.data?.market ?? null
  // Parameter changes load independently but are also passed to the debt chart for reference lines
  const paramState = useSubgraphQuery(
    () => (m ? fetchParamChanges(addr, m.assetDecimals) : Promise.resolve([])),
    "Params",
    [addr, m?.assetDecimals],
  )

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        color: T.text,
        fontFamily: T.fontBody,
      }}
    >
      <nav
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "0 32px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: `${T.bg}ee`,
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: "15px",
              fontWeight: 700,
              color: T.accent,
              letterSpacing: "-0.03em",
            }}
          >
            wildcat
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["Overview", "Markets", "Borrowers", "Lenders"].map((tab) => (
              <span
                key={tab}
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "13px",
                  fontWeight: tab === "Markets" ? 600 : 400,
                  color: tab === "Markets" ? T.text : T.textDim,
                  padding: "6px 14px",
                  borderRadius: T.radiusSm,
                  background:
                    tab === "Markets" ? `${T.accent}12` : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: "11px",
            color: T.textDim,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ cursor: "pointer" }}>markets</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: T.textMuted }}>
            {m?.name || truncAddr(addr)}
          </span>
        </div>
      </nav>

      <main
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "24px 32px 64px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Section 1: Header — always renders (has own loading/error) */}
        <section>
          <MarketHeaderSection addr={addr} />
        </section>

        {/* Remaining sections wait for header to resolve so they have assetDecimals etc. */}
        {m && (
          <>
            <section>
              <SectionHeader
                title="Market Size"
                subtitle="Total debt trajectory with parameter change markers"
              />
              <div style={{ marginTop: "12px" }}>
                <DebtChartSection
                  addr={addr}
                  dec={m.assetDecimals}
                  paramChanges={paramState.data}
                />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Parameter Change History"
                subtitle="All borrower-initiated changes to market terms"
              />
              <div style={{ marginTop: "12px" }}>
                {paramState.loading ? (
                  <SectionSkeleton height={120} label="Loading parameters..." />
                ) : paramState.error ? (
                  <SectionError label="Parameters" error={paramState.error} />
                ) : (
                  <ParameterHistorySection addr={addr} dec={m.assetDecimals} />
                )}
              </div>
            </section>
            <section>
              <SectionHeader
                title="Deposits & Withdrawals"
                subtitle="Daily fund flows and cumulative net position"
              />
              <div style={{ marginTop: "12px" }}>
                <DepositsWithdrawalsSection addr={addr} dec={m.assetDecimals} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Delinquency History"
                subtitle="Every delinquency event — frequency, severity, and cure time"
              />
              <div style={{ marginTop: "12px" }}>
                <DelinquencySection
                  addr={addr}
                  gracePeriodSec={m.gracePeriodSeconds}
                  gracePeriodHours={m.gracePeriodHours}
                />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Withdrawal Processing"
                subtitle="Batch payment history and current pending queue"
              />
              <div style={{ marginTop: "12px" }}>
                <WithdrawalBatchSection addr={addr} dec={m.assetDecimals} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Interest & Fees"
                subtitle="Cumulative cost breakdown — base interest, penalty fees, and protocol fees"
              />
              <div style={{ marginTop: "12px" }}>
                <InterestSection addr={addr} dec={m.assetDecimals} market={m} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Market Token Transfers"
                subtitle="Secondary market activity — direct token transfers"
              />
              <div style={{ marginTop: "12px" }}>
                <TransferSection addr={addr} dec={m.assetDecimals} />
              </div>
            </section>
            <section>
              <SectionHeader
                title="Lenders"
                subtitle="All lender positions — click any row to view full portfolio"
              />
              <div style={{ marginTop: "12px" }}>
                <LenderTableSection
                  addr={addr}
                  sf={m.scaleFactor}
                  dec={m.assetDecimals}
                  totalDebt={m.totalDebt}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
