"use client"

import { useState, useEffect, createContext, useContext } from "react"

import { querySubgraph, type AsyncState } from "./useSubgraphQuery"
import {
  type RawMarketDailyStats,
  type RawMarketInterestAccrued,
  type DailyProtocolPoint,
  toHuman,
  normalizeScaled,
  fmtDate,
  fmtDateShort,
} from "../constants"

// Pure function: aggregates raw daily stats + interest events into DailyProtocolPoint[]
export function processTimeSeries(
  rawDaily: RawMarketDailyStats[],
  rawInterest: RawMarketInterestAccrued[],
): DailyProtocolPoint[] {
  const getStatPrice = (ds: RawMarketDailyStats): number => {
    if (ds.usdPrice != null) return Number(ds.usdPrice)
    return ds.market.asset.isUsdStablecoin ? 1 : 0
  }

  // Build per-date price lookup from daily stats for use with interest events
  const datePrices = new Map<string, number>()
  const latestAssetPrice = new Map<string, number>()
  rawDaily.forEach((ds) => {
    const addr = ds.market.asset.address.toLowerCase()
    const date = fmtDate(ds.startTimestamp)
    const price = getStatPrice(ds)
    datePrices.set(`${addr}:${date}`, price)
    latestAssetPrice.set(addr, price)
  })

  // Group daily stats by timestamp so we can snapshot TVL at each day
  const dayGroups = new Map<number, RawMarketDailyStats[]>()
  rawDaily.forEach((ds) => {
    const group = dayGroups.get(ds.startTimestamp) || []
    group.push(ds)
    dayGroups.set(ds.startTimestamp, group)
  })

  const interestDayMap = new Map<
    string,
    { base: number; delinq: number; proto: number }
  >()
  rawInterest.forEach((evt) => {
    const dec = evt.market.asset.decimals
    const addr = evt.market.asset.address.toLowerCase()
    const day = fmtDate(evt.blockTimestamp)
    const price =
      datePrices.get(`${addr}:${day}`) ?? latestAssetPrice.get(addr) ?? 0
    const p = interestDayMap.get(day) || { base: 0, delinq: 0, proto: 0 }
    p.base += toHuman(evt.baseInterestAccrued, dec) * price
    p.delinq += toHuman(evt.delinquencyFeesAccrued, dec) * price
    p.proto += toHuman(evt.protocolFeesAccrued, dec) * price
    interestDayMap.set(day, p)
  })

  // Walk days chronologically, tracking per-market debt for TVL
  const sortedTimestamps = [...dayGroups.keys()].sort((a, b) => a - b)
  const marketDebtUSD = new Map<string, number>()
  let cumDep = 0
  let cumWd = 0
  let cumBase = 0
  let cumDelinq = 0
  let cumProto = 0

  return sortedTimestamps.map((ts) => {
    const group = dayGroups.get(ts)!
    let dayDeposits = 0
    let dayWithdrawals = 0

    group.forEach((ds) => {
      const dec = ds.market.asset.decimals
      const price = getStatPrice(ds)
      dayDeposits += toHuman(ds.totalDeposited, dec) * price
      dayWithdrawals += toHuman(ds.totalWithdrawalsRequested, dec) * price
      // Snapshot this market's debt at end of day
      const debtRaw = normalizeScaled(ds.scaledTotalSupply, ds.scaleFactor)
      marketDebtUSD.set(ds.market.id, toHuman(debtRaw, dec) * price)
    })

    cumDep += dayDeposits
    cumWd += dayWithdrawals

    // TVL = sum of all known market debts at this point
    let tvl = 0
    marketDebtUSD.forEach((v) => {
      tvl += v
    })

    const day = fmtDate(ts)
    const di = interestDayMap.get(day)
    const dailyBase = di?.base || 0
    const dailyDelinq = di?.delinq || 0
    const dailyProto = di?.proto || 0
    cumBase += dailyBase
    cumDelinq += dailyDelinq
    cumProto += dailyProto

    return {
      date: day,
      dateShort: fmtDateShort(ts),
      timestamp: ts,
      tvl,
      dailyDeposits: dayDeposits,
      dailyWithdrawals: dayWithdrawals,
      dailyWithdrawalsNeg: -dayWithdrawals,
      netFlow: cumDep - cumWd,
      baseInterest: cumBase,
      delinquencyFees: cumDelinq,
      protocolFees: cumProto,
      protocolFeesDaily: dailyProto,
      lenderInterestDaily: dailyBase + dailyDelinq,
    }
  })
}

const TimeSeriesContext = createContext<AsyncState<DailyProtocolPoint[]>>({
  data: null,
  loading: true,
  error: null,
})

export function useTimeSeries() {
  return useContext(TimeSeriesContext)
}

export function TimeSeriesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = useState<AsyncState<DailyProtocolPoint[]>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const PAGE_SIZE = 1000

    async function run() {
      try {
        let allDaily: RawMarketDailyStats[] = []
        let allInterest: RawMarketInterestAccrued[] = []
        let skipDaily = 0
        let skipInterest = 0
        let dailyDone = false
        let interestDone = false

        while (!dailyDone || !interestDone) {
          if (cancelled) return

          const fetches: Promise<
            RawMarketDailyStats[] | RawMarketInterestAccrued[] | null
          >[] = []
          if (!dailyDone) {
            fetches.push(
              querySubgraph<{
                marketDailyStats_collection: RawMarketDailyStats[]
              }>(`{
                marketDailyStats_collection(first: ${PAGE_SIZE}, skip: ${skipDaily}, orderBy: startTimestamp, orderDirection: asc) {
                  market { id asset { decimals address isUsdStablecoin } }
                  startTimestamp totalDeposited totalWithdrawalsRequested totalBorrowed totalRepaid scaledTotalSupply scaleFactor usdPrice
                }
              }`).then((d) => d.marketDailyStats_collection),
            )
          } else {
            fetches.push(Promise.resolve(null))
          }

          if (!interestDone) {
            fetches.push(
              querySubgraph<{
                marketInterestAccrueds: RawMarketInterestAccrued[]
              }>(`{
                marketInterestAccrueds(first: ${PAGE_SIZE}, skip: ${skipInterest}, orderBy: blockTimestamp, orderDirection: asc) {
                  market { id asset { decimals address } }
                  baseInterestAccrued delinquencyFeesAccrued protocolFeesAccrued blockTimestamp
                }
              }`).then((d) => d.marketInterestAccrueds),
            )
          } else {
            fetches.push(Promise.resolve(null))
          }

          // eslint-disable-next-line no-await-in-loop
          const [dailyPage, interestPage] = await Promise.all(fetches)

          if (dailyPage !== null) {
            allDaily = allDaily.concat(dailyPage as RawMarketDailyStats[])
            if ((dailyPage as RawMarketDailyStats[]).length < PAGE_SIZE)
              dailyDone = true
            else skipDaily += PAGE_SIZE
          }
          if (interestPage !== null) {
            allInterest = allInterest.concat(
              interestPage as RawMarketInterestAccrued[],
            )
            if ((interestPage as RawMarketInterestAccrued[]).length < PAGE_SIZE)
              interestDone = true
            else skipInterest += PAGE_SIZE
          }

          if (cancelled) return

          const processed = processTimeSeries(allDaily, allInterest)
          setState({ data: processed, loading: false, error: null })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        console.error("[TimeSeriesProvider] Failed:", e)
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: msg,
          }))
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <TimeSeriesContext.Provider value={state}>
      {children}
    </TimeSeriesContext.Provider>
  )
}
