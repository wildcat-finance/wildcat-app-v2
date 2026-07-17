import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderDepositPage,
  getLenderWithdrawalExecutionPage,
  getLenderWithdrawalRequestPage,
} from "@wildcatfi/wildcat-sdk"

import { LenderActivityData } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDate,
  formatDateLabel,
  formatShortDate,
  stableRecordKey,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

export const useLenderActivity = (
  lenderAddress: `0x${string}` | undefined,
  marketIds: string[],
  decimalsMap: Record<string, number>,
  priceMap: Record<string, number>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stableDecimalsMapKey = useMemo(
    () => stableRecordKey(decimalsMap),
    [decimalsMap],
  )
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<LenderActivityData>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_ACTIVITY(
        chainId,
        normalizedAddress,
        normalizedMarketIds,
      ),
      stableDecimalsMapKey,
      stablePriceMapKey,
    ],
    enabled:
      !!normalizedAddress &&
      isSubgraphPricingConfigured(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const [deposits, withdrawalRequests, withdrawalExecutions] =
        await Promise.all([
          collectIndexedPages(
            (request) =>
              getLenderDepositPage(client, {
                lender: normalizedAddress,
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getLenderWithdrawalRequestPage(client, {
                lender: normalizedAddress,
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getLenderWithdrawalExecutionPage(client, {
                lender: normalizedAddress,
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
        ])

      const getMarketPrice = (marketId: string) => {
        const price = priceMap[marketId]
        if (price === undefined) {
          throw new Error(`Missing USD price for market ${marketId}`)
        }
        return price
      }

      const activity = [
        ...deposits.map((deposit) => ({
          id: `${deposit.id}-deposit`,
          date: formatDate(Number(deposit.blockTimestamp)),
          timestamp: Number(deposit.blockTimestamp),
          market: deposit.market.name,
          marketId: deposit.market.address,
          type: "Deposit" as const,
          amountUsd:
            toHumanAmount(deposit.assetAmount, deposit.market.asset.decimals) *
            getMarketPrice(deposit.market.address),
          txHash: deposit.transactionHash,
        })),
        ...withdrawalRequests.map((request) => ({
          id: `${request.id}-request`,
          date: formatDate(Number(request.blockTimestamp)),
          timestamp: Number(request.blockTimestamp),
          market: request.market.name,
          marketId: request.market.address,
          type: "Withdrawal Request" as const,
          amountUsd:
            toHumanAmount(
              request.normalizedAmount,
              request.market.asset.decimals,
            ) * getMarketPrice(request.market.address),
          txHash: request.transactionHash,
        })),
        ...withdrawalExecutions.map((execution) => ({
          id: `${execution.id}-execution`,
          date: formatDate(Number(execution.blockTimestamp)),
          timestamp: Number(execution.blockTimestamp),
          market: execution.market.name,
          marketId: execution.market.address,
          type: "Withdrawal Execution" as const,
          amountUsd:
            toHumanAmount(
              execution.normalizedAmount,
              decimalsMap[execution.market.address] ??
                execution.market.asset.decimals,
            ) * getMarketPrice(execution.market.address),
          txHash: execution.transactionHash,
        })),
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
          } else if (entry.type === "Withdrawal Execution") {
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
