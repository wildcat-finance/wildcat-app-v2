import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getMarketDailyStatsPage,
} from "@wildcatfi/wildcat-sdk"

import {
  BorrowerAggregateDebtRaw,
  buildBorrowerAggregateDebtData,
} from "@/app/[locale]/borrower/profile/hooks/analytics/borrowerProfileTransforms"
import { BorrowerAggregateDebtPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { stableRecordKey } from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

type MarketDailyStatsRaw = BorrowerAggregateDebtRaw

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
      isSubgraphPricingConfigured(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const indexedStats = await collectIndexedPages(
        (request) =>
          getMarketDailyStatsPage(client, {
            markets: normalizedMarketIds,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )
      const marketDailyStats: MarketDailyStatsRaw[] = indexedStats.map(
        (point) => ({
          startTimestamp: point.startTimestamp,
          scaledTotalSupply: point.scaledTotalSupply.toString(),
          scaleFactor: point.scaleFactor.toString(),
          usdPrice: point.usdPrice ?? null,
          market: {
            id: point.market.address,
            asset: { decimals: point.market.asset.decimals },
          },
        }),
      )

      return buildBorrowerAggregateDebtData({
        marketDailyStats,
        priceMap,
        nameMap,
      })
    },
  })
}
