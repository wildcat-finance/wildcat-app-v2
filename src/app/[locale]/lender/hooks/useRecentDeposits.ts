"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { RECENT_DEPOSITS, RECENT_WITHDRAWAL_REQUESTS } from "@/graphql/queries"
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

type RecentWithdrawalRequestNode = {
  id: string
  normalizedAmount: string
  blockTimestamp: number
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
  /** Per-market deposits minus withdrawal requests over the last 7 days
   *  (underlying asset units; negative when outflows dominate) */
  netInflow7d: Record<string, bigint>
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
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - SEVEN_DAYS_SECONDS

      const [{ data: response }, { data: withdrawalsResponse }] =
        await Promise.all([
          subgraphClient.query<{ deposits: RecentDepositNode[] }>({
            query: RECENT_DEPOSITS,
            variables: { first: MAX_DEPOSITS },
            fetchPolicy: "network-only",
          }),
          subgraphClient.query<{
            withdrawalRequests: RecentWithdrawalRequestNode[]
          }>({
            query: RECENT_WITHDRAWAL_REQUESTS,
            variables: {
              first: MAX_DEPOSITS,
              where: { blockTimestamp_gte: sevenDaysAgo },
            },
            fetchPolicy: "network-only",
          }),
        ])

      const last7d = aggregate(
        response.deposits,
        (deposit) => deposit.blockTimestamp >= sevenDaysAgo,
      )

      const netInflow7d: Record<string, bigint> = {}
      Object.entries(last7d).forEach(([marketId, stats]) => {
        netInflow7d[marketId] = stats.totalAssetAmount
      })
      withdrawalsResponse.withdrawalRequests.forEach((request) => {
        const marketId = request.market.id.toLowerCase()
        netInflow7d[marketId] =
          (netInflow7d[marketId] ?? BigInt(0)) -
          BigInt(request.normalizedAmount)
      })

      return {
        last7d,
        broad: aggregate(response.deposits),
        netInflow7d,
      }
    },
    staleTime: 60_000,
  })

  const empty = useMemo<RecentDepositsBuckets>(
    () => ({ last7d: {}, broad: {}, netInflow7d: {} }),
    [],
  )

  return {
    data: data ?? empty,
    isLoading,
    isError,
  }
}
