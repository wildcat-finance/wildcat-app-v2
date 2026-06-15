"use client"

import { useCallback, useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { RECENT_DEPOSITS } from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

const DAY_SECONDS = 24 * 60 * 60
const MAINNET_WINDOW_DAYS = 30
const TESTNET_WINDOW_DAYS = 3650
const MAX_DEPOSITS = 1000

type RecentInflowNode = {
  market: { id: string }
}

type InflowWindow = {
  markets: Set<string>
  windowStart: number
}

export const useMarketsWithRecentInflow = () => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId, isTestnet } = useCurrentNetwork()

  const { data, isLoading, isError } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKETS_WITH_RECENT_INFLOW(targetChainId),
    queryFn: async (): Promise<InflowWindow> => {
      const windowDays = isTestnet ? TESTNET_WINDOW_DAYS : MAINNET_WINDOW_DAYS
      const windowStart =
        Math.floor(Date.now() / 1000) - windowDays * DAY_SECONDS

      const { data: response } = await subgraphClient.query<{
        deposits: RecentInflowNode[]
      }>({
        query: RECENT_DEPOSITS,
        variables: {
          first: MAX_DEPOSITS,
          where: { blockTimestamp_gt: windowStart },
        },
        fetchPolicy: "network-only",
      })

      return {
        markets: new Set(
          response.deposits.map((deposit) => deposit.market.id.toLowerCase()),
        ),
        windowStart,
      }
    },
    staleTime: 60_000,
  })

  const empty = useMemo<InflowWindow>(
    () => ({ markets: new Set<string>(), windowStart: 0 }),
    [],
  )
  const { markets, windowStart } = data ?? empty

  const isMarketQualifying = useCallback(
    (account: MarketAccount): boolean =>
      isError ||
      markets.has(account.market.address.toLowerCase()) ||
      (account.market.deployedEvent?.blockTimestamp ?? 0) >= windowStart,
    [markets, windowStart, isError],
  )

  return { isMarketQualifying, isLoading, isError }
}
