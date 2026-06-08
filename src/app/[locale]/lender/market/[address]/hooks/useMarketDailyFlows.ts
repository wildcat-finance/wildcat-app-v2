import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"
import { Market } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"
import { fetchAllGraphqlPages } from "@/lib/paginated-query"

import {
  DailyFlowPoint,
  MarketDailyFlowStat,
  toDailyFlows,
} from "./marketDailyFlows"

export type { DailyFlowPoint } from "./marketDailyFlows"

const GET_MARKET_DAILY_STATS = gql`
  query getMarketDailyStats($market: String!, $first: Int!, $skip: Int!) {
    marketDailyStats_collection(
      where: { market: $market }
      orderBy: startTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      startTimestamp
      dayDeposited
      dayWithdrawalsRequested
      dayWithdrawalsExecuted
    }
  }
`

type MarketDailyStatsQuery = {
  marketDailyStats_collection: MarketDailyFlowStat[]
}

type MarketDailyStatsVariables = {
  market: string
}

export function useMarketDailyFlows(market: Market | undefined) {
  const marketAddress = market?.address.toLowerCase()
  const decimals = market?.underlyingToken.decimals ?? 18

  const hinterlightClient = useMemo(
    () => (market ? getHinterlightClient(market.chainId) : undefined),
    [market],
  )

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_DAILY_FLOWS(
      market?.chainId ?? 0,
      marketAddress,
    ),
    enabled:
      !!marketAddress &&
      !!hinterlightClient &&
      isHinterlightSupported(market?.chainId),
    refetchInterval: 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!marketAddress || !hinterlightClient) {
        throw new Error("Missing daily flow analytics client")
      }

      const marketDailyStats = await fetchAllGraphqlPages<
        MarketDailyStatsQuery,
        MarketDailyStatsVariables,
        MarketDailyStatsQuery["marketDailyStats_collection"][number]
      >({
        client: hinterlightClient,
        query: GET_MARKET_DAILY_STATS,
        variables: { market: marketAddress },
        getItems: (page) => page.marketDailyStats_collection,
      })

      return toDailyFlows(marketDailyStats, decimals)
    },
  })

  return {
    dailyFlows: data ?? [],
    isLoading,
    symbol: market?.underlyingToken.symbol ?? "",
  }
}
