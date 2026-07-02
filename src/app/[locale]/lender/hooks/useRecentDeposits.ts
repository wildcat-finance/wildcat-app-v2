"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { RECENT_DEPOSITS } from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60
const MAX_DEPOSITS = 1000

type RecentDepositNode = {
  id: string
  assetAmount: string
  blockTimestamp: number
  account: { address: string }
  market: { id: string }
}

export type MarketDepositStats = {
  totalAssetAmount: bigint
  uniqueLenders: number
}

export type RecentDepositsData = Record<string, MarketDepositStats>

export type RecentDepositsBuckets = {
  last7d: RecentDepositsData
  broad: RecentDepositsData
}

const aggregate = (
  nodes: RecentDepositNode[],
  filter?: (node: RecentDepositNode) => boolean,
): RecentDepositsData => {
  const byMarket = new Map<string, { total: bigint; lenders: Set<string> }>()
  nodes.forEach((deposit) => {
    if (filter && !filter(deposit)) return
    const marketId = deposit.market.id.toLowerCase()
    const entry = byMarket.get(marketId) ?? {
      total: BigInt(0),
      lenders: new Set<string>(),
    }
    entry.total += BigInt(deposit.assetAmount)
    entry.lenders.add(deposit.account.address.toLowerCase())
    byMarket.set(marketId, entry)
  })
  const result: RecentDepositsData = {}
  byMarket.forEach((value, key) => {
    result[key] = {
      totalAssetAmount: value.total,
      uniqueLenders: value.lenders.size,
    }
  })
  return result
}

export const useRecentDeposits = () => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId } = useCurrentNetwork()

  const { data, isLoading, isError } = useQuery({
    queryKey: QueryKeys.Lender.GET_RECENT_DEPOSITS(targetChainId),
    queryFn: async (): Promise<RecentDepositsBuckets> => {
      const { data: response } = await subgraphClient.query<{
        deposits: RecentDepositNode[]
      }>({
        query: RECENT_DEPOSITS,
        variables: { first: MAX_DEPOSITS },
        fetchPolicy: "network-only",
      })

      const sevenDaysAgo = Math.floor(Date.now() / 1000) - SEVEN_DAYS_SECONDS
      return {
        last7d: aggregate(
          response.deposits,
          (deposit) => deposit.blockTimestamp >= sevenDaysAgo,
        ),
        broad: aggregate(response.deposits),
      }
    },
    staleTime: 60_000,
  })

  const empty = useMemo<RecentDepositsBuckets>(
    () => ({ last7d: {}, broad: {} }),
    [],
  )

  return {
    data: data ?? empty,
    isLoading,
    isError,
  }
}
