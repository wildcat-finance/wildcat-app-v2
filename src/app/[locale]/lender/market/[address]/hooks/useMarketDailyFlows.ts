import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getMarketDailyStatsPage,
  Market,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
} from "@/lib/subgraphCapabilities"

import { MarketDailyFlowStat, toDailyFlows } from "./marketDailyFlows"

export type { DailyFlowPoint } from "./marketDailyFlows"

export function useMarketDailyFlows(
  market: Market | undefined,
  enabled = true,
) {
  const marketAddress = market?.address.toLowerCase()
  const decimals = market?.underlyingToken.decimals ?? 18

  const subgraphClient = useMemo(
    () => getConfiguredSubgraphClient(market?.chainId),
    [market],
  )

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_DAILY_FLOWS(
      market?.chainId ?? 0,
      marketAddress,
    ),
    enabled:
      enabled &&
      !!marketAddress &&
      !!subgraphClient &&
      isSubgraphAnalyticsConfigured(market?.chainId),
    refetchInterval: 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!marketAddress || !subgraphClient) {
        throw new Error("Missing daily flow analytics client")
      }

      const indexedStats = await collectIndexedPages(
        (request) =>
          getMarketDailyStatsPage(subgraphClient, {
            markets: [marketAddress],
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )
      const marketDailyStats: MarketDailyFlowStat[] = indexedStats.map(
        (point) => ({
          startTimestamp: point.startTimestamp,
          dayDeposited: point.dayDeposited.toString(),
          dayWithdrawalsRequested: point.dayWithdrawalsRequested.toString(),
          dayWithdrawalsExecuted: point.dayWithdrawalsExecuted.toString(),
        }),
      )

      return toDailyFlows(marketDailyStats, decimals)
    },
  })

  return {
    dailyFlows: data ?? [],
    isLoading,
    symbol: market?.underlyingToken.symbol ?? "",
  }
}
