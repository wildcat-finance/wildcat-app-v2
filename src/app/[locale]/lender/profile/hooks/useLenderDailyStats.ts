import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderDailyStatsPage,
} from "@wildcatfi/wildcat-sdk"

import {
  formatDateLabel,
  formatShortDate,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

export type LenderDailyCashFlowPoint = {
  date: string
  dateShort: string
  timestamp: number
  dayDeposits: number
  dayWithdrawalsRequested: number
  dayWithdrawalsExecuted: number
  dayInterestEarned: number
  cumDeposits: number
  cumWithdrawalsRequested: number
  cumWithdrawalsExecuted: number
  cumInterestEarned: number
  netFlowExecuted: number
  netFlowRequested: number
  pendingBand: number
}

export const useLenderDailyStats = (
  lenderAddress: `0x${string}` | undefined,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()

  return useQuery<LenderDailyCashFlowPoint[]>({
    queryKey: ["lender", "GET_PROFILE_DAILY_STATS", chainId, normalizedAddress],
    enabled: !!normalizedAddress && isSubgraphPricingConfigured(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const lenderDailyStats = await collectIndexedPages(
        (request) =>
          getLenderDailyStatsPage(client, {
            lender: normalizedAddress,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )

      return lenderDailyStats
        .slice()
        .sort((left, right) => left.startTimestamp - right.startTimestamp)
        .map((point) => {
          const cumDeposits = Number(point.totalDepositedUSD) || 0
          const cumWithdrawalsRequested =
            Number(point.totalWithdrawalsRequestedUSD) || 0
          const cumWithdrawalsExecuted =
            Number(point.totalWithdrawalsExecutedUSD) || 0
          const cumInterestEarned = Number(point.totalInterestEarnedUSD) || 0

          return {
            date: formatDateLabel(point.startTimestamp),
            dateShort: formatShortDate(point.startTimestamp),
            timestamp: point.startTimestamp,
            dayDeposits: Number(point.dayDepositedUSD) || 0,
            dayWithdrawalsRequested:
              Number(point.dayWithdrawalsRequestedUSD) || 0,
            dayWithdrawalsExecuted:
              Number(point.dayWithdrawalsExecutedUSD) || 0,
            dayInterestEarned: Number(point.dayInterestEarnedUSD) || 0,
            cumDeposits,
            cumWithdrawalsRequested,
            cumWithdrawalsExecuted,
            cumInterestEarned,
            netFlowExecuted: cumDeposits - cumWithdrawalsExecuted,
            netFlowRequested: cumDeposits - cumWithdrawalsRequested,
            pendingBand: Math.max(
              0,
              cumWithdrawalsRequested - cumWithdrawalsExecuted,
            ),
          }
        })
    },
  })
}
