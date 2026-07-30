import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderPositionPage,
  getLenderWithdrawalStatusPage,
  Market,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
} from "@/lib/subgraphCapabilities"

export type LenderMarketAnalytics = {
  activeLendersCount?: number
  totalWithdrawalsExecuted?: TokenAmount
  isLoading: boolean
}

export const sumLenderWithdrawalsExecuted = (
  withdrawals: { normalizedAmountWithdrawn: bigint }[],
): bigint =>
  withdrawals.reduce(
    (total, withdrawal) => total + withdrawal.normalizedAmountWithdrawn,
    BigInt(0),
  )

export function useLenderMarketAnalytics(
  market: Market | undefined,
  lenderAddress: `0x${string}` | undefined,
  enabled = true,
): LenderMarketAnalytics {
  const marketAddress = market?.address.toLowerCase()
  const lender = lenderAddress?.toLowerCase()
  const subgraphClient = useMemo(
    () => getConfiguredSubgraphClient(market?.chainId),
    [market],
  )
  const analyticsConfigured =
    !!subgraphClient && isSubgraphAnalyticsConfigured(market?.chainId)

  const { data: activeLendersCount, isLoading: isLoadingActiveLenders } =
    useQuery({
      queryKey: QueryKeys.Lender.GET_ACTIVE_LENDERS_COUNT(
        market?.chainId ?? 0,
        marketAddress,
      ),
      enabled: enabled && !!marketAddress && analyticsConfigured,
      refetchInterval: 60_000,
      refetchOnMount: false,
      staleTime: 60_000,
      queryFn: async () => {
        if (!marketAddress || !subgraphClient) throw new Error("Missing market")

        const activeLenders = await collectIndexedPages(
          (request) =>
            getLenderPositionPage(subgraphClient, {
              markets: [marketAddress],
              activeOnly: true,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        )

        return activeLenders.length
      },
    })

  const { data: totalWithdrawalsExecutedRaw, isLoading: isLoadingWithdrawals } =
    useQuery({
      queryKey: QueryKeys.Lender.GET_MARKET_WITHDRAWALS_EXECUTED(
        market?.chainId ?? 0,
        marketAddress,
        lender,
      ),
      enabled: enabled && !!marketAddress && !!lender && analyticsConfigured,
      refetchInterval: 60_000,
      refetchOnMount: false,
      staleTime: 60_000,
      queryFn: async () => {
        if (!marketAddress || !lender || !subgraphClient) {
          throw new Error("Missing lender market")
        }

        const withdrawals = await collectIndexedPages(
          (request) =>
            getLenderWithdrawalStatusPage(subgraphClient, {
              lender,
              markets: [marketAddress],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        )

        return sumLenderWithdrawalsExecuted(withdrawals)
      },
    })

  const totalWithdrawalsExecuted = useMemo(
    () =>
      market && totalWithdrawalsExecutedRaw !== undefined
        ? market.underlyingToken.getAmount(totalWithdrawalsExecutedRaw)
        : undefined,
    [market, totalWithdrawalsExecutedRaw],
  )

  return {
    activeLendersCount,
    totalWithdrawalsExecuted,
    isLoading: isLoadingActiveLenders || isLoadingWithdrawals,
  }
}
