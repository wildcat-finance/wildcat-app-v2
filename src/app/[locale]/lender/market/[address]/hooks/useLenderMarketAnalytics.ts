import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"
import { Market, TokenAmount, getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"

import { LenderWithdrawalsForMarketResult } from "./useGetLenderWithdrawals"

const ACTIVE_LENDERS_LIMIT = 1000

const GET_ACTIVE_LENDERS = gql`
  query getActiveLenders($market: ID!, $first: Int!) {
    lenderAccounts(
      where: { market: $market, scaledBalance_gt: "0" }
      first: $first
    ) {
      id
    }
  }
`

type ActiveLendersQuery = {
  lenderAccounts: Array<{ id: string }>
}

type ActiveLendersQueryVariables = {
  market: string
  first: number
}

export type LenderMarketAnalytics = {
  activeLendersCount?: number
  totalWithdrawalsExecuted?: TokenAmount
  isLoadingActiveLenders: boolean
}

export function useLenderMarketAnalytics(
  market: Market | undefined,
  withdrawals: LenderWithdrawalsForMarketResult,
): LenderMarketAnalytics {
  const marketAddress = market?.address.toLowerCase()
  const subgraphClient = useMemo(
    () => (market ? getSubgraphClient(market.chainId) : undefined),
    [market],
  )

  const totalWithdrawalsExecuted = useMemo(() => {
    if (!market) return undefined

    const allWithdrawals = [
      ...withdrawals.completeWithdrawals,
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...withdrawals.expiredPendingWithdrawals,
    ]

    return allWithdrawals.reduce(
      (total, withdrawal) => total.add(withdrawal.normalizedAmountWithdrawn),
      market.underlyingToken.getAmount(0),
    )
  }, [market, withdrawals])

  const { data: activeLendersCount, isLoading: isLoadingActiveLenders } =
    useQuery({
      queryKey: QueryKeys.Lender.GET_ACTIVE_LENDERS_COUNT(
        market?.chainId ?? 0,
        marketAddress,
      ),
      enabled: !!marketAddress && !!subgraphClient,
      refetchInterval: 60_000,
      refetchOnMount: false,
      queryFn: async () => {
        if (!marketAddress || !subgraphClient) throw new Error("Missing market")

        const result = await subgraphClient.query<
          ActiveLendersQuery,
          ActiveLendersQueryVariables
        >({
          query: GET_ACTIVE_LENDERS,
          variables: {
            market: marketAddress,
            first: ACTIVE_LENDERS_LIMIT,
          },
        })

        return result.data.lenderAccounts.length
      },
    })

  return {
    activeLendersCount,
    totalWithdrawalsExecuted,
    isLoadingActiveLenders,
  }
}
