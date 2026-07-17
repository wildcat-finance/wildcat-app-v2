import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderWithdrawalStatusPage,
} from "@wildcatfi/wildcat-sdk"

import { LenderBatchRow } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDate,
  stableRecordKey,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

export const useLenderBatches = (
  lenderAddress: `0x${string}` | undefined,
  marketIds: string[],
  priceMap: Record<string, number>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<LenderBatchRow[]>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_BATCHES(
        chainId,
        normalizedAddress,
        normalizedMarketIds,
      ),
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

      const lenderWithdrawalStatuses = await collectIndexedPages(
        (request) =>
          getLenderWithdrawalStatusPage(client, {
            lender: normalizedAddress,
            markets: normalizedMarketIds,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )

      return lenderWithdrawalStatuses
        .slice()
        .sort((left, right) => Number(right.batch.expiry - left.batch.expiry))
        .map((status) => {
          const marketId = status.market.address
          const price = priceMap[marketId]
          if (price === undefined) {
            throw new Error(`Missing USD price for market ${marketId}`)
          }
          const requested =
            toHumanAmount(
              status.totalNormalizedRequests,
              status.market.asset.decimals,
            ) * price
          const withdrawn =
            toHumanAmount(
              status.normalizedAmountWithdrawn,
              status.market.asset.decimals,
            ) * price

          return {
            id: status.batch.id,
            marketId,
            marketName: status.market.name,
            requested,
            withdrawn,
            remaining: Math.max(0, requested - withdrawn),
            isCompleted: status.isCompleted,
            isClosed: status.batch.isClosed,
            isExpired: status.batch.isExpired,
            expiry: formatDate(Number(status.batch.expiry)),
          }
        })
    },
  })
}
