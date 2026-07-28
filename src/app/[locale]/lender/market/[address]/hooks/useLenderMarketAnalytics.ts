import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderPositionPage,
  Market,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
} from "@/lib/subgraphCapabilities"

import { LenderWithdrawalsForMarketResult } from "./useGetLenderWithdrawals"

export type LenderMarketAnalytics = {
  activeLendersCount?: number
  totalWithdrawalsExecuted?: TokenAmount
  isLoadingActiveLenders: boolean
}

export function useLenderMarketAnalytics(
  market: Market | undefined,
  withdrawals: LenderWithdrawalsForMarketResult,
  enabled = true,
): LenderMarketAnalytics {
  const marketAddress = market?.address.toLowerCase()
  const subgraphClient = useMemo(
    () => getConfiguredSubgraphClient(market?.chainId),
    [market],
  )

  const totalWithdrawalsExecuted = useMemo(() => {
    if (!enabled || !market) return undefined

    const allWithdrawals = [
      ...withdrawals.completeWithdrawals,
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...withdrawals.expiredPendingWithdrawals,
    ]

    return allWithdrawals.reduce(
      (total, withdrawal) => total.add(withdrawal.normalizedAmountWithdrawn),
      market.underlyingToken.getAmount(0),
    )
  }, [enabled, market, withdrawals])

  const { data: activeLendersCount, isLoading: isLoadingActiveLenders } =
    useQuery({
      queryKey: QueryKeys.Lender.GET_ACTIVE_LENDERS_COUNT(
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

  return {
    activeLendersCount,
    totalWithdrawalsExecuted,
    isLoadingActiveLenders,
  }
}
