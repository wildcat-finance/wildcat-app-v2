import {
  toHuman,
  normalizeScaled,
  fmtDate,
  fmtDateShort,
  fmtUSD,
  truncAddr,
} from "../../constants"
import { querySubgraph } from "../../hooks/useSubgraphQuery"
import { truncTx } from "../constants"
import type {
  RawMarket,
  RawLenderAccount,
  RawMarketDailyStats,
  RawMarketInterestAccrued,
  RawParameterChanges,
  RawDelinquencyEvent,
  RawWithdrawalBatch,
  RawTransfer,
  RawBatchDetail,
  MarketInfo,
  DailyDataPoint,
  ParameterChange,
  DelinquencyEvent,
  BatchResults,
  BatchDetail,
  FillProgressionPoint,
  RawWithdrawalRequest,
  RawWithdrawalBatchPayment,
  WithdrawalBatchData,
  LenderData,
  TransferData,
} from "../types"

export async function fetchMarket(addr: string): Promise<RawMarket> {
  const d = await querySubgraph<{ market: RawMarket }>(`{
    market(id: "${addr}") {
      id name symbol decimals borrower
      asset { symbol decimals address isUsdStablecoin }
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

export async function fetchLenders(addr: string): Promise<RawLenderAccount[]> {
  const d = await querySubgraph<{ lenderAccounts: RawLenderAccount[] }>(`{
    lenderAccounts(where: { market: "${addr}" }, orderBy: scaledBalance, orderDirection: desc, first: 100) {
      address scaledBalance totalDeposited totalInterestEarned addedTimestamp
    }
  }`)
  return d.lenderAccounts
}

export async function fetchMarketAndLenders(
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
      isStablecoin: raw.asset.isUsdStablecoin,
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

export async function fetchDailyData(
  addr: string,
  dec: number,
): Promise<DailyDataPoint[]> {
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
  rawInterest.forEach((evt) => {
    const day = fmtDate(evt.blockTimestamp)
    const p = interestByDay.get(day) || { base: 0, delinq: 0, proto: 0 }
    p.base += toHuman(evt.baseInterestAccrued, dec)
    p.delinq += toHuman(evt.delinquencyFeesAccrued, dec)
    p.proto += toHuman(evt.protocolFeesAccrued, dec)
    interestByDay.set(day, p)
  })

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

export async function fetchParamChanges(
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

export async function fetchDelinquency(
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

export async function fetchBatches(
  addr: string,
  dec: number,
): Promise<BatchResults> {
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

export async function fetchLenderTable(
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

export async function fetchTransferData(
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

export function buildFillProgression(
  requests: RawWithdrawalRequest[],
  payments: RawWithdrawalBatchPayment[],
  dec: number,
  expiryTs: number,
): FillProgressionPoint[] {
  const events: { ts: number; type: "req" | "pay"; amount: number }[] = []
  requests.forEach((r) =>
    events.push({
      ts: r.blockTimestamp,
      type: "req",
      amount: toHuman(r.normalizedAmount, dec),
    }),
  )
  payments.forEach((p) =>
    events.push({
      ts: p.blockTimestamp,
      type: "pay",
      amount: toHuman(p.normalizedAmountPaid, dec),
    }),
  )
  events.sort((a, b) => a.ts - b.ts)

  const points: FillProgressionPoint[] = []
  let cumRequested = 0
  let cumPaid = 0
  let injectedExpiry = false

  events.forEach((e) => {
    if (!injectedExpiry && e.ts >= expiryTs) {
      points.push({
        timestamp: expiryTs,
        date: fmtDate(expiryTs),
        totalRequested: cumRequested,
        totalPaid: cumPaid,
      })
      injectedExpiry = true
    }
    if (e.type === "req") cumRequested += e.amount
    else cumPaid += e.amount
    points.push({
      timestamp: e.ts,
      date: fmtDate(e.ts),
      totalRequested: cumRequested,
      totalPaid: cumPaid,
    })
  })

  if (!injectedExpiry) {
    points.push({
      timestamp: expiryTs,
      date: fmtDate(expiryTs),
      totalRequested: cumRequested,
      totalPaid: cumPaid,
    })
  }

  return points
}

export async function fetchBatchDetail(
  batchId: string,
  dec: number,
): Promise<BatchDetail> {
  const raw = await querySubgraph<{ withdrawalBatch: RawBatchDetail }>(`{
    withdrawalBatch(id: "${batchId}") {
      id expiry totalNormalizedRequests normalizedAmountPaid
      isExpired isClosed lenderWithdrawalsCount
      creation { blockTimestamp }
      requests(orderBy: blockTimestamp, orderDirection: asc, first: 200) {
        account { address } normalizedAmount blockTimestamp transactionHash
      }
      payments(orderBy: blockTimestamp, orderDirection: asc, first: 200) {
        normalizedAmountPaid blockTimestamp transactionHash
      }
      executions(orderBy: blockTimestamp, orderDirection: asc, first: 200) {
        account { address } normalizedAmount blockTimestamp transactionHash
      }
      withdrawals(first: 200) {
        account { address } totalNormalizedRequests normalizedAmountWithdrawn
        isCompleted requestsCount executionsCount
      }
      interestAccrualRecords(orderBy: blockTimestamp, orderDirection: asc, first: 200) {
        interestEarned blockTimestamp transactionHash
      }
    }
  }`).then((d) => d.withdrawalBatch)

  const expiryTs = Number(raw.expiry)
  const totalRequested = toHuman(raw.totalNormalizedRequests, dec)
  const totalPaid = toHuman(raw.normalizedAmountPaid, dec)
  const shortfall = totalRequested - totalPaid

  let status: BatchDetail["status"] = "pending"
  if (raw.isExpired || raw.isClosed) {
    if (shortfall <= 0.01) {
      status = "paid"
    } else if (raw.isClosed) {
      status = "paid-late"
    } else {
      status = "unpaid"
    }
  }

  const interestEarned = raw.interestAccrualRecords.reduce(
    (sum, r) => sum + toHuman(r.interestEarned, dec),
    0,
  )

  const fillProgression = buildFillProgression(
    raw.requests,
    raw.payments,
    dec,
    expiryTs,
  )

  return {
    id: raw.id,
    expiry: expiryTs,
    totalRequested,
    totalPaid,
    lenderCount: raw.lenderWithdrawalsCount,
    interestEarned,
    createdDate: fmtDate(raw.creation.blockTimestamp),
    expiryDate: fmtDate(expiryTs),
    paymentsCount: raw.payments.length,
    executionsCount: raw.executions.length,
    isExpired: raw.isExpired,
    isClosed: raw.isClosed,
    status,
    fillProgression,
    lenders: raw.withdrawals.map((w) => ({
      address: truncAddr(w.account.address),
      requested: toHuman(w.totalNormalizedRequests, dec),
      withdrawn: toHuman(w.normalizedAmountWithdrawn, dec),
      complete: w.isCompleted,
      requests: w.requestsCount,
      executions: w.executionsCount,
    })),
    requests: raw.requests.map((r) => ({
      date: fmtDate(r.blockTimestamp),
      lender: truncAddr(r.account.address),
      amount: toHuman(r.normalizedAmount, dec),
      tx: truncTx(r.transactionHash),
      txFull: r.transactionHash,
    })),
    payments: raw.payments.map((p) => ({
      date: fmtDate(p.blockTimestamp),
      amountPaid: toHuman(p.normalizedAmountPaid, dec),
      tx: truncTx(p.transactionHash),
      txFull: p.transactionHash,
    })),
    executionLog: raw.executions.map((e) => ({
      date: fmtDate(e.blockTimestamp),
      lender: truncAddr(e.account.address),
      amount: toHuman(e.normalizedAmount, dec),
      tx: truncTx(e.transactionHash),
      txFull: e.transactionHash,
    })),
    interestAccruals: raw.interestAccrualRecords.map((r) => ({
      date: fmtDate(r.blockTimestamp),
      interestEarned: toHuman(r.interestEarned, dec),
      tx: truncTx(r.transactionHash),
      txFull: r.transactionHash,
    })),
  }
}
