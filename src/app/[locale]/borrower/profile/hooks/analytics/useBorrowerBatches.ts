import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import {
  BorrowerWithdrawalBatchRaw,
  buildBorrowerWithdrawalAnalytics,
} from "@/app/[locale]/borrower/profile/hooks/analytics/borrowerProfileTransforms"
import { BorrowerWithdrawalAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"
import { fetchAllGraphqlPages } from "@/lib/paginated-query"

const GET_BORROWER_WITHDRAWAL_BATCHES = gql`
  query getBorrowerWithdrawalBatches(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    withdrawalBatches(
      where: { market_in: $marketIds }
      orderBy: expiry
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      id
      expiry
      isExpired
      isClosed
      totalNormalizedRequests
      market {
        id
        name
        asset {
          decimals
        }
      }
      expiration {
        normalizedAmountPaid
        normalizedAmountOwed
      }
    }
  }
`

type BorrowerWithdrawalBatchesQuery = {
  withdrawalBatches: BorrowerWithdrawalBatchRaw[]
}

type BorrowerWithdrawalBatchesVariables = {
  marketIds: string[]
}

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

  return useQuery<BorrowerWithdrawalAnalytics>({
    queryKey: QueryKeys.Borrower.GET_PROFILE_BATCHES(
      chainId,
      normalizedAddress,
      normalizedMarketIds,
    ),
    enabled: isHinterlightSupported(chainId) && normalizedMarketIds.length > 0,
    refetchOnMount: false,
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const withdrawalBatches = await fetchAllGraphqlPages<
        BorrowerWithdrawalBatchesQuery,
        BorrowerWithdrawalBatchesVariables,
        BorrowerWithdrawalBatchesQuery["withdrawalBatches"][number]
      >({
        client,
        query: GET_BORROWER_WITHDRAWAL_BATCHES,
        variables: {
          marketIds: normalizedMarketIds,
        },
        getItems: (page) => page.withdrawalBatches,
      })

      return buildBorrowerWithdrawalAnalytics({
        withdrawalBatches,
        priceMap,
        nowSec: Math.floor(Date.now() / 1000),
      })
    },
  })
}
