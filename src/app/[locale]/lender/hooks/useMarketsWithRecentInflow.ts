"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

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

export const useMarketsWithRecentInflow = () => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId, isTestnet } = useCurrentNetwork()

  const { data, isLoading, isError } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKETS_WITH_RECENT_INFLOW(targetChainId),
    queryFn: async (): Promise<Set<string>> => {
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

      return new Set(
        response.deposits.map((deposit) => deposit.market.id.toLowerCase()),
      )
    },
    staleTime: 60_000,
  })

  const empty = useMemo(() => new Set<string>(), [])

  return {
    qualifyingMarkets: data ?? empty,
    isLoading,
    isError,
  }
}
