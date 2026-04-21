import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"
import { Market, getSubgraphClient } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "ethers/lib/utils"

import { QueryKeys } from "@/config/query-keys"

const GET_MARKET_DAILY_STATS = gql`
  query getMarketDailyStats($market: String!, $first: Int!) {
    marketDailyStats_collection(
      where: { market: $market }
      orderBy: startTimestamp
      orderDirection: asc
      first: $first
    ) {
      startTimestamp
      totalDeposited
      totalWithdrawalsRequested
      totalWithdrawalsExecuted
    }
  }
`

type MarketDailyStatsQuery = {
  marketDailyStats_collection: Array<{
    startTimestamp: number
    totalDeposited: string
    totalWithdrawalsRequested: string
    totalWithdrawalsExecuted: string
  }>
}

type MarketDailyStatsVariables = {
  market: string
  first: number
}

export type DailyFlowPoint = {
  date: string
  dateShort: string
  timestamp: number
  dailyDeposit: number
  dailyWithdrawalRequested: number
  dailyWithdrawalExecuted: number
  dailyWithdrawalRequestedNeg: number
  dailyWithdrawalExecutedNeg: number
  netFlow: number
}

function formatDateShort(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function formatDateISO(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

function toDailyFlows(
  stats: MarketDailyStatsQuery["marketDailyStats_collection"],
  decimals: number,
): DailyFlowPoint[] {
  // Despite the "total" prefix, the deployed subgraph (v2.0.23) records
  // per-day deltas in these fields (values are non-monotonic across days).
  // Accumulate them here to derive the cumulative running total.
  let cumDep = 0
  let cumReq = 0
  let cumExec = 0

  return stats.map((s) => {
    const dep = parseFloat(formatUnits(s.totalDeposited, decimals))
    const req = parseFloat(formatUnits(s.totalWithdrawalsRequested, decimals))
    const exec = parseFloat(formatUnits(s.totalWithdrawalsExecuted, decimals))
    cumDep += dep
    cumReq += req
    cumExec += exec

    return {
      date: formatDateISO(s.startTimestamp),
      dateShort: formatDateShort(s.startTimestamp),
      timestamp: s.startTimestamp,
      dailyDeposit: dep,
      dailyWithdrawalRequested: req,
      dailyWithdrawalExecuted: exec,
      dailyWithdrawalRequestedNeg: -req,
      dailyWithdrawalExecutedNeg: -exec,
      netFlow: cumDep - cumReq,
    }
  })
}

export function useMarketDailyFlows(market: Market | undefined) {
  const marketAddress = market?.address.toLowerCase()
  const decimals = market?.underlyingToken.decimals ?? 18

  const subgraphClient = useMemo(
    () => (market ? getSubgraphClient(market.chainId) : undefined),
    [market],
  )

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_DAILY_FLOWS(
      market?.chainId ?? 0,
      marketAddress,
    ),
    enabled: !!marketAddress && !!subgraphClient,
    refetchInterval: 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!marketAddress || !subgraphClient) throw new Error("Missing data")

      const result = await subgraphClient.query<
        MarketDailyStatsQuery,
        MarketDailyStatsVariables
      >({
        query: GET_MARKET_DAILY_STATS,
        variables: { market: marketAddress, first: 1000 },
      })

      return toDailyFlows(result.data.marketDailyStats_collection, decimals)
    },
  })

  return {
    dailyFlows: data ?? [],
    isLoading,
    symbol: market?.underlyingToken.symbol ?? "",
  }
}
