import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import {
  formatDateLabel,
  formatShortDate,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_LENDER_DAILY_STATS = gql`
  query getLenderDailyStats($lender: Bytes!) {
    lenderDailyStats: lenderDailyStats_collection(
      where: { lender: $lender }
      orderBy: startTimestamp
      orderDirection: asc
      first: 1000
    ) {
      startTimestamp
      dayDepositedUSD
      dayWithdrawalsRequestedUSD
      dayWithdrawalsExecutedUSD
      dayInterestEarnedUSD
      totalDepositedUSD
      totalWithdrawalsRequestedUSD
      totalWithdrawalsExecutedUSD
      totalInterestEarnedUSD
    }
  }
`

type LenderDailyStatsQuery = {
  lenderDailyStats: Array<{
    startTimestamp: number
    dayDepositedUSD: string
    dayWithdrawalsRequestedUSD: string
    dayWithdrawalsExecutedUSD: string
    dayInterestEarnedUSD: string
    totalDepositedUSD: string
    totalWithdrawalsRequestedUSD: string
    totalWithdrawalsExecutedUSD: string
    totalInterestEarnedUSD: string
  }>
}

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
    enabled: !!normalizedAddress && isHinterlightSupported(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const result = await client.query<LenderDailyStatsQuery>({
        query: GET_LENDER_DAILY_STATS,
        variables: { lender: normalizedAddress },
      })

      return result.data.lenderDailyStats.map((point) => {
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
          dayWithdrawalsExecuted: Number(point.dayWithdrawalsExecutedUSD) || 0,
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
