import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import {
  BorrowerAggregateDebtRaw,
  buildBorrowerAggregateDebtData,
} from "@/app/[locale]/borrower/profile/hooks/analytics/borrowerProfileTransforms"
import { BorrowerAggregateDebtPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { stableRecordKey } from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"
import { fetchAllGraphqlPages } from "@/lib/paginated-query"

const GET_BORROWER_AGGREGATE_DEBT = gql`
  query getBorrowerAggregateDebt(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    marketDailyStats: marketDailyStats_collection(
      where: { market_in: $marketIds }
      orderBy: startTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      startTimestamp
      scaledTotalSupply
      scaleFactor
      usdPrice
      market {
        id
        asset {
          decimals
        }
      }
    }
  }
`

type MarketDailyStatsRaw = BorrowerAggregateDebtRaw

type BorrowerAggregateDebtQuery = {
  marketDailyStats: MarketDailyStatsRaw[]
}

type BorrowerAggregateDebtVariables = {
  marketIds: string[]
}

export type BorrowerAggregateDebtData = {
  points: BorrowerAggregateDebtPoint[]
  marketIds: string[]
}

export const useBorrowerAggregateDebt = (
  borrowerAddress: `0x${string}` | undefined,
  marketIds: string[],
  priceMap: Record<string, number>,
  nameMap: Record<string, string>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<BorrowerAggregateDebtData>({
    queryKey: [
      "borrower",
      "GET_PROFILE_AGGREGATE_DEBT",
      chainId,
      normalizedAddress,
      normalizedMarketIds,
      stablePriceMapKey,
    ],
    enabled:
      !!normalizedAddress &&
      isHinterlightSupported(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const marketDailyStats = await fetchAllGraphqlPages<
        BorrowerAggregateDebtQuery,
        BorrowerAggregateDebtVariables,
        MarketDailyStatsRaw
      >({
        client,
        query: GET_BORROWER_AGGREGATE_DEBT,
        variables: { marketIds: normalizedMarketIds },
        getItems: (page) => page.marketDailyStats,
      })

      return buildBorrowerAggregateDebtData({
        marketDailyStats,
        priceMap,
        nameMap,
      })
    },
  })
}
