"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { RECENT_DEPOSITS, RECENT_WITHDRAWAL_REQUESTS } from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

const DAY_SECONDS = 24 * 60 * 60
const MAX_ACTIVITY_PAGE_SIZE = 1000

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
  /** Per-market deposits minus withdrawal requests over each activity window
   *  (underlying asset units; negative when outflows dominate). */
  netInflow7d: Record<string, bigint>
  netInflow30d: Record<string, bigint>
  netInflow90d: Record<string, bigint>
}

const fetchAllPages = async <T>(
  fetchPage: (skip: number) => Promise<T[]>,
  skip = 0,
  previous: T[] = [],
): Promise<T[]> => {
  const page = await fetchPage(skip)
  const nodes = [...previous, ...page]
  return page.length < MAX_ACTIVITY_PAGE_SIZE
    ? nodes
    : fetchAllPages(fetchPage, skip + MAX_ACTIVITY_PAGE_SIZE, nodes)
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

const aggregateNetInflow = (
  deposits: RecentDepositNode[],
  withdrawals: RecentWithdrawalRequestNode[],
  windowStart: number,
): Record<string, bigint> => {
  const depositsInWindow = aggregate(
    deposits,
    (deposit) => deposit.blockTimestamp >= windowStart,
  )
  const result: Record<string, bigint> = {}

  Object.entries(depositsInWindow).forEach(([marketId, stats]) => {
    result[marketId] = stats.totalAssetAmount
  })
  withdrawals.forEach((request) => {
    if (request.blockTimestamp < windowStart) return
    const marketId = request.market.id.toLowerCase()
    result[marketId] =
      (result[marketId] ?? BigInt(0)) - BigInt(request.normalizedAmount)
  })

  return result
}

export const useRecentDeposits = () => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId } = useCurrentNetwork()

  const { data, isLoading, isError } = useQuery({
    queryKey: QueryKeys.Lender.GET_RECENT_DEPOSITS(targetChainId),
    queryFn: async (): Promise<RecentDepositsBuckets> => {
      const now = Math.floor(Date.now() / 1000)
      const sevenDaysAgo = now - 7 * DAY_SECONDS
      const thirtyDaysAgo = now - 30 * DAY_SECONDS
      const ninetyDaysAgo = now - 90 * DAY_SECONDS

      const [{ data: broadResponse }, recentDeposits, recentWithdrawals] =
        await Promise.all([
          subgraphClient.query<{ deposits: RecentDepositNode[] }>({
            query: RECENT_DEPOSITS,
            variables: { first: MAX_ACTIVITY_PAGE_SIZE, skip: 0 },
            fetchPolicy: "network-only",
          }),
          fetchAllPages(async (skip) => {
            const { data: recentResponse } = await subgraphClient.query<{
              deposits: RecentDepositNode[]
            }>({
              query: RECENT_DEPOSITS,
              variables: {
                first: MAX_ACTIVITY_PAGE_SIZE,
                skip,
                where: { blockTimestamp_gte: ninetyDaysAgo },
              },
              fetchPolicy: "network-only",
            })
            return recentResponse.deposits
          }),
          fetchAllPages(async (skip) => {
            const { data: recentResponse } = await subgraphClient.query<{
              withdrawalRequests: RecentWithdrawalRequestNode[]
            }>({
              query: RECENT_WITHDRAWAL_REQUESTS,
              variables: {
                first: MAX_ACTIVITY_PAGE_SIZE,
                skip,
                where: { blockTimestamp_gte: ninetyDaysAgo },
              },
              fetchPolicy: "network-only",
            })
            return recentResponse.withdrawalRequests
          }),
        ])

      const last7d = aggregate(
        recentDeposits,
        (deposit) => deposit.blockTimestamp >= sevenDaysAgo,
      )

      return {
        last7d,
        broad: aggregate(broadResponse.deposits),
        netInflow7d: aggregateNetInflow(
          recentDeposits,
          recentWithdrawals,
          sevenDaysAgo,
        ),
        netInflow30d: aggregateNetInflow(
          recentDeposits,
          recentWithdrawals,
          thirtyDaysAgo,
        ),
        netInflow90d: aggregateNetInflow(
          recentDeposits,
          recentWithdrawals,
          ninetyDaysAgo,
        ),
      }
    },
    staleTime: 60_000,
  })

  const empty = useMemo<RecentDepositsBuckets>(
    () => ({
      last7d: {},
      broad: {},
      netInflow7d: {},
      netInflow30d: {},
      netInflow90d: {},
    }),
    [],
  )

  return {
    data: data ?? empty,
    isLoading,
    isError,
  }
}
