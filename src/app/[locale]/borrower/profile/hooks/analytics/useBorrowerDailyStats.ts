import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerInterestCostPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"
import { fetchAllGraphqlPages } from "@/lib/paginated-query"

const GET_BORROWER_DAILY_STATS = gql`
  query getBorrowerDailyStats($borrower: Bytes!, $first: Int!, $skip: Int!) {
    borrowerDailyStats: borrowerDailyStats_collection(
      where: { borrower: $borrower }
      orderBy: startTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      startTimestamp
      dayBaseInterestAccruedUSD
      dayDelinquencyFeesAccruedUSD
      dayProtocolFeesAccruedUSD
    }
  }
`

type BorrowerDailyStatsQuery = {
  borrowerDailyStats: Array<{
    startTimestamp: number
    dayBaseInterestAccruedUSD: string
    dayDelinquencyFeesAccruedUSD: string
    dayProtocolFeesAccruedUSD: string
  }>
}

type BorrowerDailyStatsVariables = {
  borrower: string
}

export const useBorrowerDailyStats = (
  borrowerAddress: `0x${string}` | undefined,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = borrowerAddress?.toLowerCase()

  return useQuery<BorrowerInterestCostPoint[]>({
    queryKey: [
      "borrower",
      "GET_PROFILE_DAILY_STATS",
      chainId,
      normalizedAddress,
    ],
    enabled: !!normalizedAddress && isHinterlightSupported(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing borrower address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const borrowerDailyStats = await fetchAllGraphqlPages<
        BorrowerDailyStatsQuery,
        BorrowerDailyStatsVariables,
        BorrowerDailyStatsQuery["borrowerDailyStats"][number]
      >({
        client,
        query: GET_BORROWER_DAILY_STATS,
        variables: { borrower: normalizedAddress },
        getItems: (page) => page.borrowerDailyStats,
      })

      let cumBase = 0
      let cumDelinq = 0
      let cumProtocol = 0

      return borrowerDailyStats.map((point) => {
        cumBase += Number(point.dayBaseInterestAccruedUSD) || 0
        cumDelinq += Number(point.dayDelinquencyFeesAccruedUSD) || 0
        cumProtocol += Number(point.dayProtocolFeesAccruedUSD) || 0

        return {
          date: formatDateLabel(point.startTimestamp),
          dateShort: formatShortDate(point.startTimestamp),
          timestamp: point.startTimestamp,
          dayBaseInterest: Number(point.dayBaseInterestAccruedUSD) || 0,
          dayDelinquencyFees: Number(point.dayDelinquencyFeesAccruedUSD) || 0,
          dayProtocolFees: Number(point.dayProtocolFeesAccruedUSD) || 0,
          baseInterest: cumBase,
          delinquencyFees: cumDelinq,
          protocolFees: cumProtocol,
          totalCost: cumBase + cumDelinq + cumProtocol,
        }
      })
    },
  })
}
