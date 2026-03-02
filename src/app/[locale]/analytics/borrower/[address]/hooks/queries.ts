import {
  toHuman,
  normalizeScaled,
  fmtDate,
  fmtDateShort,
  fmtUSD,
} from "../../../constants"
import { fetchLatestTokenPrices } from "../../../hooks/queries"
import { querySubgraph } from "../../../hooks/useSubgraphQuery"
import { truncTx } from "../../../market/constants"
import type {
  RawBorrowerMarket,
  RawMarketDailyStats,
  RawDelinquencyEvent,
  RawWithdrawalBatch,
  RawMarketInterestAccrued,
  RawLenderAccount,
  RawParameterChanges,
  BorrowerProfile,
  BorrowerMarketRow,
  AggDebtPoint,
  BorrowerDelinquencyEvent,
  BorrowerBatchResults,
  BorrowerInterestSummary,
  BorrowerParameterChange,
  LenderOverlapEntry,
} from "../types"

// ─── helpers ──────────────────────────────────────────────

function marketIdsFilter(ids: string[]): string {
  return ids.map((id) => `"${id}"`).join(", ")
}

function getStatus(m: RawBorrowerMarket): BorrowerMarketRow["status"] {
  if (m.isClosed) return "Closed"
  if (m.isIncurringPenalties) return "Penalty"
  if (m.isDelinquent) return "Delinquent"
  return "Healthy"
}

function getMarketType(m: RawBorrowerMarket): string {
  if (m.hooks?.kind === "OpenTerm") return "Open-term"
  if (m.hooks?.kind === "FixedTerm") return "Fixed-term"
  return "Unknown"
}

function elapsed(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  if (days >= 365) {
    const y = Math.floor(days / 365)
    const mo = Math.floor((days % 365) / 30)
    return mo > 0 ? `${y}y ${mo}mo` : `${y}y`
  }
  if (days >= 30) return `${Math.floor(days / 30)}mo`
  return `${days}d`
}

// ─── 1. Borrower Markets ──────────────────────────────────

export async function fetchBorrowerMarkets(addr: string): Promise<{
  profile: BorrowerProfile
  markets: BorrowerMarketRow[]
  priceMap: Record<string, number>
}> {
  const d = await querySubgraph<{ markets: RawBorrowerMarket[] }>(`{
    markets(where: { borrower: "${addr.toLowerCase()}" }, orderBy: createdAt, first: 100) {
      id name asset { symbol decimals address } hooks { kind }
      annualInterestBips reserveRatioBips delinquencyGracePeriod delinquencyFeeBips
      withdrawalBatchDuration maxTotalSupply scaledTotalSupply scaleFactor
      isDelinquent isIncurringPenalties isClosed
      totalBorrowed totalRepaid totalDeposited
      totalBaseInterestAccrued totalDelinquencyFeesAccrued totalProtocolFeesAccrued
      createdAt
    }
  }`)

  const raw = d.markets
  if (raw.length === 0) {
    return {
      profile: {
        address: addr,
        firstMarketCreated: "—",
        timeOnProtocol: "—",
        activeMarkets: 0,
        closedMarkets: 0,
        assetsUsed: [],
        totalDebt: 0,
        totalCapacity: 0,
        avgUtilization: 0,
        avgAPR: 0,
        totalBorrowed: 0,
        totalRepaid: 0,
      },
      markets: [],
      priceMap: {},
    }
  }

  // Fetch token prices for all unique assets
  const uniqueAssets = Array.from(
    new Set(raw.map((m) => m.asset.address.toLowerCase())),
  )
  const tokenPrices = await fetchLatestTokenPrices(uniqueAssets)
  const getPrice = (assetAddr: string): number =>
    tokenPrices[assetAddr.toLowerCase()] ?? 0

  // Build per-market price map (market id → USD price per token)
  const priceMap: Record<string, number> = {}
  raw.forEach((m) => {
    priceMap[m.id] = getPrice(m.asset.address)
  })

  const markets: BorrowerMarketRow[] = raw.map((m) => {
    const dec = m.asset.decimals
    const price = priceMap[m.id]
    const debtRaw = normalizeScaled(m.scaledTotalSupply, m.scaleFactor)
    const totalDebt = toHuman(debtRaw, dec) * price
    const capacity = toHuman(m.maxTotalSupply, dec) * price
    return {
      id: m.id,
      name: m.name,
      asset: m.asset.symbol,
      assetAddress: m.asset.address,
      decimals: dec,
      marketType: getMarketType(m),
      totalDebt,
      capacity,
      apr: m.annualInterestBips / 100,
      utilization: capacity > 0 ? (totalDebt / capacity) * 100 : 0,
      status: getStatus(m),
      created: fmtDate(m.createdAt),
      scaleFactor: m.scaleFactor,
      gracePeriodSec: m.delinquencyGracePeriod,
    }
  })

  const active = markets.filter((m) => m.status !== "Closed")
  const totalDebt = active.reduce((s, m) => s + m.totalDebt, 0)
  const totalCapacity = markets.reduce((s, m) => s + m.capacity, 0)
  const avgUtil =
    totalDebt > 0
      ? active.reduce((s, m) => s + m.utilization * m.totalDebt, 0) / totalDebt
      : 0
  const avgAPR =
    totalDebt > 0
      ? active.reduce((s, m) => s + m.apr * m.totalDebt, 0) / totalDebt
      : 0
  const earliest = Math.min(...raw.map((m) => m.createdAt))
  const assets = Array.from(new Set(raw.map((m) => m.asset.symbol)))
  const totalBorrowed = raw.reduce(
    (s, m) => s + toHuman(m.totalBorrowed, m.asset.decimals) * priceMap[m.id],
    0,
  )
  const totalRepaid = raw.reduce(
    (s, m) => s + toHuman(m.totalRepaid, m.asset.decimals) * priceMap[m.id],
    0,
  )

  return {
    profile: {
      address: addr,
      firstMarketCreated: fmtDate(earliest),
      timeOnProtocol: elapsed(Math.floor(Date.now() / 1000) - earliest),
      activeMarkets: active.length,
      closedMarkets: markets.filter((m) => m.status === "Closed").length,
      assetsUsed: assets,
      totalDebt,
      totalCapacity,
      avgUtilization: avgUtil,
      avgAPR,
      totalBorrowed,
      totalRepaid,
    },
    markets,
    priceMap,
  }
}

// ─── 2. Aggregate Debt ────────────────────────────────────

export async function fetchAggregateDebt(
  marketIds: string[],
  priceMap: Record<string, number>,
): Promise<AggDebtPoint[]> {
  if (marketIds.length === 0) return []

  const d = await querySubgraph<{
    marketDailyStats_collection: RawMarketDailyStats[]
  }>(`{
    marketDailyStats_collection(
      where: { market_in: [${marketIdsFilter(marketIds)}] }
      orderBy: startTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market { id asset { decimals address isUsdStablecoin } }
      startTimestamp scaledTotalSupply scaleFactor usdPrice
    }
  }`)

  // Track latest observed price per asset for fallback
  const latestAssetPrice = new Map<string, number>()

  const byDay = new Map<number, Record<string, number>>()
  d.marketDailyStats_collection.forEach((s) => {
    const mid = s.market.id
    const dec = s.market.asset.decimals
    // Prefer the per-day usdPrice from the stat, fall back to latest token price
    let price: number
    if (s.usdPrice != null) {
      price = Number(s.usdPrice)
    } else if (s.market.asset.isUsdStablecoin) {
      price = 1
    } else {
      price = priceMap[mid] ?? 0
    }
    const addr = s.market.asset.address.toLowerCase()
    latestAssetPrice.set(addr, price)
    const debt =
      toHuman(normalizeScaled(s.scaledTotalSupply, s.scaleFactor), dec) * price
    const existing = byDay.get(s.startTimestamp) || {}
    existing[mid] = debt
    byDay.set(s.startTimestamp, existing)
  })

  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0] - b[0])
  const lastKnown: Record<string, number> = {}
  return sorted.map(([ts, vals]) => {
    marketIds.forEach((id) => {
      if (vals[id] !== undefined) lastKnown[id] = vals[id]
    })
    const point: AggDebtPoint = {
      date: fmtDate(ts),
      dateShort: fmtDateShort(ts),
      timestamp: ts,
    }
    marketIds.forEach((id) => {
      point[id] = lastKnown[id] || 0
    })
    return point
  })
}

// ─── 3. Delinquency ───────────────────────────────────────

export async function fetchBorrowerDelinquency(
  marketIds: string[],
  gracePeriodMap: Record<string, number>,
  nameMap: Record<string, string>,
): Promise<BorrowerDelinquencyEvent[]> {
  if (marketIds.length === 0) return []

  const raw = await querySubgraph<{
    delinquencyStatusChangeds: RawDelinquencyEvent[]
  }>(`{
    delinquencyStatusChangeds(
      where: { market_in: [${marketIdsFilter(marketIds)}] }
      orderBy: blockTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market { id } isDelinquent blockTimestamp
    }
  }`).then((r) => r.delinquencyStatusChangeds)

  const byMarket = new Map<string, RawDelinquencyEvent[]>()
  raw.forEach((evt) => {
    const list = byMarket.get(evt.market.id) || []
    list.push(evt)
    byMarket.set(evt.market.id, list)
  })

  const events: BorrowerDelinquencyEvent[] = []
  byMarket.forEach((evts, mid) => {
    const gp = gracePeriodMap[mid] ?? 0
    let open: { ts: number; idx: number } | null = null
    evts.forEach((evt) => {
      if (evt.isDelinquent) {
        open = { ts: evt.blockTimestamp, idx: events.length + 1 }
      } else if (open) {
        const dur = evt.blockTimestamp - open.ts
        events.push({
          marketId: mid,
          marketName: nameMap[mid] ?? mid.slice(0, 10),
          id: open.idx,
          start: fmtDate(open.ts),
          startTs: open.ts,
          end: fmtDate(evt.blockTimestamp),
          endTs: evt.blockTimestamp,
          durationHours: Math.round(dur / 3600),
          penalized: dur > gp,
        })
        open = null
      }
    })
    if (open) {
      const now = Math.floor(Date.now() / 1000)
      events.push({
        marketId: mid,
        marketName: nameMap[mid] ?? mid.slice(0, 10),
        id: (open as { idx: number }).idx,
        start: fmtDate((open as { ts: number }).ts),
        startTs: (open as { ts: number }).ts,
        end: null,
        endTs: null,
        durationHours: Math.round((now - (open as { ts: number }).ts) / 3600),
        penalized: now - (open as { ts: number }).ts > gp,
      })
    }
  })

  events.sort((a, b) => a.startTs - b.startTs)
  return events
}

// ─── 4. Withdrawal Batches ────────────────────────────────

export async function fetchBorrowerBatches(
  marketIds: string[],
  decimalsMap: Record<string, number>,
  nameMap: Record<string, string>,
  priceMap: Record<string, number>,
): Promise<BorrowerBatchResults> {
  if (marketIds.length === 0)
    return {
      totalExpired: 0,
      fullyPaidPct: 100,
      paidLateCount: 0,
      unpaidCount: 0,
      avgShortfallPct: 0,
      pendingBatches: 0,
      totalQueued: 0,
      nextExpiry: "—",
      batches: [],
    }

  const raw = await querySubgraph<{
    withdrawalBatches: RawWithdrawalBatch[]
  }>(`{
    withdrawalBatches(
      where: { market_in: [${marketIdsFilter(marketIds)}] }
      orderBy: expiry
      orderDirection: asc
      first: 200
    ) {
      market { id } id expiry totalNormalizedRequests normalizedAmountPaid
      isExpired isClosed lenderWithdrawalsCount
      expiration { normalizedAmountPaid normalizedAmountOwed blockTimestamp }
    }
  }`).then((r) => r.withdrawalBatches)

  type BatchRow = BorrowerBatchResults["batches"][number]
  const expired: BatchRow[] = []
  let pBatches = 0
  let tQueued = 0
  let nExpiry = Infinity

  raw.forEach((b) => {
    const dec = decimalsMap[b.market.id] ?? 18
    const price = priceMap[b.market.id] ?? 0
    const requested = toHuman(b.totalNormalizedRequests, dec) * price
    const mName = nameMap[b.market.id] ?? b.market.id.slice(0, 10)

    if (!b.isExpired && !b.isClosed) {
      pBatches += 1
      tQueued += requested
      const exp = Number(b.expiry)
      if (exp < nExpiry) nExpiry = exp
      return
    }

    let paidAtExpiry = requested
    let shortfall = 0
    if (b.expiration) {
      paidAtExpiry = toHuman(b.expiration.normalizedAmountPaid, dec) * price
      shortfall = toHuman(b.expiration.normalizedAmountOwed, dec) * price
    }
    let status: BatchRow["status"] = "paid"
    if (shortfall > 0.01) {
      status = b.isClosed ? "paid-late" : "unpaid"
    }
    expired.push({
      marketName: mName,
      label: `#${expired.length + 1}`,
      requested,
      paidAtExpiry,
      shortfall,
      status,
    })
  })

  const total = expired.length
  const paidFull = expired.filter((b) => b.status === "paid").length
  const underpaid = expired.filter((b) => b.shortfall > 0.01)
  return {
    totalExpired: total,
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
    pendingBatches: pBatches,
    totalQueued: tQueued,
    nextExpiry:
      nExpiry < Infinity
        ? `${Math.max(0, Math.round((nExpiry - Date.now() / 1000) / 3600))}h`
        : "—",
    batches: expired,
  }
}

// ─── 5. Interest & Cost ───────────────────────────────────

export async function fetchBorrowerInterest(
  marketIds: string[],
  priceMap: Record<string, number>,
  profile: BorrowerProfile,
): Promise<BorrowerInterestSummary> {
  if (marketIds.length === 0)
    return {
      totalCost: 0,
      totalBaseInterest: 0,
      totalDelinquencyFees: 0,
      totalProtocolFees: 0,
      annualizedCost: "—",
      penaltyRatio: "0%",
      points: [],
    }

  const raw = await querySubgraph<{
    marketInterestAccrueds: RawMarketInterestAccrued[]
  }>(`{
    marketInterestAccrueds(
      where: { market_in: [${marketIdsFilter(marketIds)}] }
      orderBy: blockTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market { id asset { decimals address } }
      baseInterestAccrued delinquencyFeesAccrued protocolFeesAccrued blockTimestamp
    }
  }`).then((r) => r.marketInterestAccrueds)

  const byDay = new Map<
    string,
    { base: number; delinq: number; proto: number; ts: number }
  >()
  raw.forEach((evt) => {
    const dec = evt.market.asset.decimals
    const price = priceMap[evt.market.id] ?? 0
    const day = fmtDate(evt.blockTimestamp)
    const p = byDay.get(day) || {
      base: 0,
      delinq: 0,
      proto: 0,
      ts: evt.blockTimestamp,
    }
    p.base += toHuman(evt.baseInterestAccrued, dec) * price
    p.delinq += toHuman(evt.delinquencyFeesAccrued, dec) * price
    p.proto += toHuman(evt.protocolFeesAccrued, dec) * price
    byDay.set(day, p)
  })

  const sorted = Array.from(byDay.entries()).sort((a, b) => a[1].ts - b[1].ts)
  let cumBase = 0
  let cumDelinq = 0
  let cumProto = 0
  const points = sorted.map(([day, p]) => {
    cumBase += p.base
    cumDelinq += p.delinq
    cumProto += p.proto
    return {
      date: day,
      dateShort: fmtDateShort(p.ts),
      timestamp: p.ts,
      baseInterest: cumBase,
      delinquencyFees: cumDelinq,
      protocolFees: cumProto,
    }
  })

  const totalCost = cumBase + cumDelinq + cumProto
  const firstTs =
    profile.firstMarketCreated !== "—"
      ? new Date(profile.firstMarketCreated).getTime() / 1000
      : 0
  const ageYears =
    firstTs > 0 ? (Date.now() / 1000 - firstTs) / (365.25 * 86400) : 0
  const annualizedCost =
    ageYears > 0 && profile.totalDebt > 0
      ? `${((totalCost / ageYears / profile.totalDebt) * 100).toFixed(2)}%`
      : "—"
  const penaltyRatio =
    totalCost > 0 ? `${((cumDelinq / totalCost) * 100).toFixed(1)}%` : "0%"

  return {
    totalCost,
    totalBaseInterest: cumBase,
    totalDelinquencyFees: cumDelinq,
    totalProtocolFees: cumProto,
    annualizedCost,
    penaltyRatio,
    points,
  }
}

// ─── 6. Parameter Changes ─────────────────────────────────

export async function fetchBorrowerParamChanges(
  marketIds: string[],
  decimalsMap: Record<string, number>,
  nameMap: Record<string, string>,
  priceMap: Record<string, number>,
): Promise<BorrowerParameterChange[]> {
  if (marketIds.length === 0) return []

  const filter = marketIdsFilter(marketIds)
  const raw = await querySubgraph<RawParameterChanges>(`{
    annualInterestBipsUpdateds(where: { market_in: [${filter}] }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { market { id } oldAnnualInterestBips newAnnualInterestBips blockTimestamp transactionHash }
    reserveRatioBipsUpdateds(where: { market_in: [${filter}] }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { market { id } oldReserveRatioBips newReserveRatioBips blockTimestamp transactionHash }
    maxTotalSupplyUpdateds(where: { market_in: [${filter}] }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { market { id } oldMaxTotalSupply newMaxTotalSupply blockTimestamp transactionHash }
    fixedTermUpdateds(where: { market_in: [${filter}] }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { market { id } oldFixedTermEndTime newFixedTermEndTime blockTimestamp transactionHash }
    minimumDepositUpdateds(where: { market_in: [${filter}] }, orderBy: blockTimestamp, orderDirection: desc, first: 100) { market { id } oldMinimumDeposit newMinimumDeposit blockTimestamp transactionHash }
  }`)

  const ch: BorrowerParameterChange[] = []
  const mName = (id: string) => nameMap[id] ?? id.slice(0, 10)

  raw.annualInterestBipsUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      market: mName(e.market.id),
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
      market: mName(e.market.id),
      parameter: "Reserve Ratio",
      oldValue: `${(e.oldReserveRatioBips / 100).toFixed(1)}%`,
      newValue: `${(e.newReserveRatioBips / 100).toFixed(1)}%`,
      tx: truncTx(e.transactionHash),
    })
  })
  raw.maxTotalSupplyUpdateds.forEach((e) => {
    const dec = decimalsMap[e.market.id] ?? 18
    const price = priceMap[e.market.id] ?? 0
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      market: mName(e.market.id),
      parameter: "Max Capacity",
      oldValue: fmtUSD(toHuman(e.oldMaxTotalSupply, dec) * price),
      newValue: fmtUSD(toHuman(e.newMaxTotalSupply, dec) * price),
      tx: truncTx(e.transactionHash),
    })
  })
  raw.fixedTermUpdateds.forEach((e) => {
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      market: mName(e.market.id),
      parameter: "Fixed Term End",
      oldValue: fmtDate(e.oldFixedTermEndTime),
      newValue: fmtDate(e.newFixedTermEndTime),
      tx: truncTx(e.transactionHash),
    })
  })
  raw.minimumDepositUpdateds.forEach((e) => {
    const dec = decimalsMap[e.market.id] ?? 18
    const price = priceMap[e.market.id] ?? 0
    ch.push({
      date: fmtDate(e.blockTimestamp),
      timestamp: e.blockTimestamp,
      market: mName(e.market.id),
      parameter: "Min Deposit",
      oldValue: e.oldMinimumDeposit
        ? fmtUSD(toHuman(e.oldMinimumDeposit, dec) * price)
        : "—",
      newValue: fmtUSD(toHuman(e.newMinimumDeposit, dec) * price),
      tx: truncTx(e.transactionHash),
    })
  })

  ch.sort((a, b) => b.timestamp - a.timestamp)
  return ch
}

// ─── 7. Lender Overlap ────────────────────────────────────

export async function fetchBorrowerLenders(
  marketIds: string[],
  decimalsMap: Record<string, number>,
  sfMap: Record<string, string>,
  priceMap: Record<string, number>,
  totalDebt: number,
): Promise<LenderOverlapEntry[]> {
  if (marketIds.length === 0) return []

  const raw = await querySubgraph<{
    lenderAccounts: RawLenderAccount[]
  }>(`{
    lenderAccounts(
      where: { market_in: [${marketIdsFilter(
        marketIds,
      )}], scaledBalance_gt: "0" }
      orderBy: scaledBalance
      orderDirection: desc
      first: 1000
    ) {
      address
      market { id name asset { decimals } scaleFactor }
      scaledBalance totalDeposited totalInterestEarned
    }
  }`).then((r) => r.lenderAccounts)

  const byLender = new Map<
    string,
    {
      markets: Set<string>
      totalDeposited: number
      currentBalance: number
      interestEarned: number
    }
  >()

  raw.forEach((l) => {
    const mid = l.market.id
    const dec = decimalsMap[mid] ?? l.market.asset.decimals
    const sf = sfMap[mid] ?? l.market.scaleFactor
    const price = priceMap[mid] ?? 0
    const bal = toHuman(normalizeScaled(l.scaledBalance, sf), dec) * price
    const dep = toHuman(l.totalDeposited, dec) * price
    const int = toHuman(l.totalInterestEarned, dec) * price

    const existing = byLender.get(l.address) || {
      markets: new Set<string>(),
      totalDeposited: 0,
      currentBalance: 0,
      interestEarned: 0,
    }
    existing.markets.add(l.market.name)
    existing.totalDeposited += dep
    existing.currentBalance += bal
    existing.interestEarned += int
    byLender.set(l.address, existing)
  })

  const entries: LenderOverlapEntry[] = []
  byLender.forEach((v, a) => {
    entries.push({
      address: a,
      marketCount: v.markets.size,
      markets: Array.from(v.markets),
      totalDeposited: v.totalDeposited,
      currentBalance: v.currentBalance,
      interestEarned: v.interestEarned,
      pctOfDebt: totalDebt > 0 ? (v.currentBalance / totalDebt) * 100 : 0,
    })
  })

  entries.sort((a, b) => b.currentBalance - a.currentBalance)
  return entries
}
