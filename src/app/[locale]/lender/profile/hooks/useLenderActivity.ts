import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { LenderActivityData } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDate,
  formatDateLabel,
  formatShortDate,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_LENDER_DEPOSITS = gql`
  query getLenderDeposits($accountIds: [String!]!) {
    deposits(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 500
    ) {
      market {
        id
        name
        asset {
          decimals
        }
      }
      assetAmount
      blockTimestamp
      transactionHash
    }
  }
`

const GET_LENDER_WITHDRAWAL_REQUESTS = gql`
  query getLenderWithdrawalRequests($accountIds: [String!]!) {
    withdrawalRequests(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 500
    ) {
      market {
        id
        name
        asset {
          decimals
        }
      }
      normalizedAmount
      blockTimestamp
      transactionHash
    }
  }
`

const GET_LENDER_WITHDRAWAL_EXECUTIONS = gql`
  query getLenderWithdrawalExecutions($accountIds: [String!]!) {
    withdrawalExecutions(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 500
    ) {
      account {
        market {
          id
          name
        }
      }
      normalizedAmount
      blockTimestamp
      transactionHash
    }
  }
`

type LenderDepositsQuery = {
  deposits: Array<{
    market: {
      id: string
      name: string
      asset: {
        decimals: number
      }
    }
    assetAmount: string
    blockTimestamp: number
    transactionHash: string
  }>
}

type LenderWithdrawalRequestsQuery = {
  withdrawalRequests: Array<{
    market: {
      id: string
      name: string
      asset: {
        decimals: number
      }
    }
    normalizedAmount: string
    blockTimestamp: number
    transactionHash: string
  }>
}

type LenderWithdrawalExecutionsQuery = {
  withdrawalExecutions: Array<{
    account: {
      market: {
        id: string
        name: string
      }
    }
    normalizedAmount: string
    blockTimestamp: number
    transactionHash: string
  }>
}

type AccountIdsVariables = {
  accountIds: string[]
}

export const useLenderActivity = (
  lenderAddress: `0x${string}` | undefined,
  marketIds: string[],
  decimalsMap: Record<string, number>,
  priceMap: Record<string, number>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])

  return useQuery<LenderActivityData>({
    queryKey: QueryKeys.Lender.GET_PROFILE_ACTIVITY(
      chainId,
      normalizedAddress,
      normalizedMarketIds,
    ),
    enabled:
      !!normalizedAddress &&
      isHinterlightSupported(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const accountIds = normalizedMarketIds.map(
        (marketId) => `LENDER-${marketId.toLowerCase()}-${normalizedAddress}`,
      )

      const [
        depositsResult,
        withdrawalRequestsResult,
        withdrawalExecutionsResult,
      ] = await Promise.all([
        client.query<LenderDepositsQuery, AccountIdsVariables>({
          query: GET_LENDER_DEPOSITS,
          variables: { accountIds },
        }),
        client.query<LenderWithdrawalRequestsQuery, AccountIdsVariables>({
          query: GET_LENDER_WITHDRAWAL_REQUESTS,
          variables: { accountIds },
        }),
        client.query<LenderWithdrawalExecutionsQuery, AccountIdsVariables>({
          query: GET_LENDER_WITHDRAWAL_EXECUTIONS,
          variables: { accountIds },
        }),
      ])

      const activity = [
        ...depositsResult.data.deposits.map((deposit) => ({
          id: `${deposit.transactionHash}-deposit`,
          date: formatDate(deposit.blockTimestamp),
          timestamp: deposit.blockTimestamp,
          market: deposit.market.name,
          marketId: deposit.market.id,
          type: "Deposit" as const,
          amountUsd:
            toHumanAmount(deposit.assetAmount, deposit.market.asset.decimals) *
            (priceMap[deposit.market.id] ?? 0),
          txHash: deposit.transactionHash,
        })),
        ...withdrawalRequestsResult.data.withdrawalRequests.map((request) => ({
          id: `${request.transactionHash}-request`,
          date: formatDate(request.blockTimestamp),
          timestamp: request.blockTimestamp,
          market: request.market.name,
          marketId: request.market.id,
          type: "Withdrawal Request" as const,
          amountUsd:
            toHumanAmount(
              request.normalizedAmount,
              request.market.asset.decimals,
            ) * (priceMap[request.market.id] ?? 0),
          txHash: request.transactionHash,
        })),
        ...withdrawalExecutionsResult.data.withdrawalExecutions.map(
          (execution) => ({
            id: `${execution.transactionHash}-execution`,
            date: formatDate(execution.blockTimestamp),
            timestamp: execution.blockTimestamp,
            market: execution.account.market.name,
            marketId: execution.account.market.id,
            type: "Withdrawal Execution" as const,
            amountUsd:
              toHumanAmount(
                execution.normalizedAmount,
                decimalsMap[execution.account.market.id] ?? 18,
              ) * (priceMap[execution.account.market.id] ?? 0),
            txHash: execution.transactionHash,
          }),
        ),
      ].sort((left, right) => right.timestamp - left.timestamp)

      const flowsByDay = new Map<
        string,
        {
          timestamp: number
          deposits: number
          withdrawals: number
        }
      >()

      activity
        .slice()
        .sort((left, right) => left.timestamp - right.timestamp)
        .forEach((entry) => {
          const dateKey = formatDateLabel(entry.timestamp)
          const existing = flowsByDay.get(dateKey) ?? {
            timestamp: entry.timestamp,
            deposits: 0,
            withdrawals: 0,
          }

          if (entry.type === "Deposit") {
            existing.deposits += entry.amountUsd
          } else {
            existing.withdrawals += entry.amountUsd
          }

          flowsByDay.set(dateKey, existing)
        })

      let cumulativeDeposits = 0
      let cumulativeWithdrawals = 0

      const cashFlow = Array.from(flowsByDay.entries())
        .sort((left, right) => left[1].timestamp - right[1].timestamp)
        .map(([date, point]) => {
          cumulativeDeposits += point.deposits
          cumulativeWithdrawals += point.withdrawals

          return {
            date,
            dateShort: formatShortDate(point.timestamp),
            timestamp: point.timestamp,
            cumDeposits: cumulativeDeposits,
            cumWithdrawals: cumulativeWithdrawals,
            netFlow: cumulativeDeposits - cumulativeWithdrawals,
          }
        })

      return {
        activity,
        cashFlow,
      }
    },
  })
}
