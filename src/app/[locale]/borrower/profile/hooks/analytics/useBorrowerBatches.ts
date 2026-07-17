import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getBorrowerWithdrawalReliabilityPage,
} from "@wildcatfi/wildcat-sdk"

import {
  BorrowerWithdrawalBatchRaw,
  buildBorrowerWithdrawalAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/borrowerProfileTransforms"
import { BorrowerWithdrawalAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { stableRecordKey } from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

export const useBorrowerBatches = (
  borrowerAddress: `0x${string}` | undefined,
  marketIds: string[],
  priceMap: Record<string, number>,
  externalChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<BorrowerWithdrawalAnalytics>({
    queryKey: [
      ...QueryKeys.Borrower.GET_PROFILE_BATCHES(
        chainId,
        normalizedAddress,
        normalizedMarketIds,
      ),
      stablePriceMapKey,
    ],
    enabled:
      isSubgraphPricingConfigured(chainId) && normalizedMarketIds.length > 0,
    refetchOnMount: false,
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const indexedBatches = await collectIndexedPages(
        (request) =>
          getBorrowerWithdrawalReliabilityPage(client, {
            markets: normalizedMarketIds,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )
      const withdrawalBatches: BorrowerWithdrawalBatchRaw[] = indexedBatches
        .map((batch) => ({
          id: batch.id,
          expiry: batch.expiry.toString(),
          isExpired: batch.isExpired,
          isClosed: batch.isClosed,
          totalNormalizedRequests: batch.totalNormalizedRequests.toString(),
          market: {
            id: batch.market.address,
            name: batch.market.name,
            asset: { decimals: batch.market.asset.decimals },
          },
          expiration: batch.expiration
            ? {
                normalizedAmountPaid:
                  batch.expiration.normalizedAmountPaid.toString(),
                normalizedAmountOwed:
                  batch.expiration.normalizedAmountOwed.toString(),
              }
            : null,
        }))
        .sort((left, right) => Number(left.expiry) - Number(right.expiry))

      return buildBorrowerWithdrawalAnalytics({
        withdrawalBatches,
        priceMap,
        nowSec: Math.floor(Date.now() / 1000),
      })
    },
  })
}
