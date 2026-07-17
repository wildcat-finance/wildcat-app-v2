import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getBorrowerDailyStatsPage,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerInterestCostPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

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
    enabled: !!normalizedAddress && isSubgraphPricingConfigured(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing borrower address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const borrowerDailyStats = await collectIndexedPages(
        (request) =>
          getBorrowerDailyStatsPage(client, {
            borrower: normalizedAddress,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )

      let cumBase = 0
      let cumDelinq = 0
      let cumProtocol = 0

      return borrowerDailyStats
        .slice()
        .sort((left, right) => left.startTimestamp - right.startTimestamp)
        .map((point) => {
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
