import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { LenderBatchRow } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDate,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_LENDER_PROFILE_BATCHES = gql`
  query getLenderProfileBatches($accountIds: [String!]!) {
    lenderWithdrawalStatuses(
      where: { account_in: $accountIds }
      orderBy: batch__expiry
      orderDirection: desc
      first: 300
    ) {
      batch {
        id
        expiry
        isClosed
        isExpired
      }
      account {
        market {
          id
          name
          asset {
            decimals
          }
        }
      }
      totalNormalizedRequests
      normalizedAmountWithdrawn
      isCompleted
    }
  }
`

type LenderProfileBatchesQuery = {
  lenderWithdrawalStatuses: Array<{
    batch: {
      id: string
      expiry: string
      isClosed: boolean
      isExpired: boolean
    }
    account: {
      market: {
        id: string
        name: string
        asset: {
          decimals: number
        }
      }
    }
    totalNormalizedRequests: string
    normalizedAmountWithdrawn: string
    isCompleted: boolean
  }>
}

type AccountIdsVariables = {
  accountIds: string[]
}

export const useLenderBatches = (
  lenderAddress: `0x${string}` | undefined,
  marketIds: string[],
  priceMap: Record<string, number>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])

  return useQuery<LenderBatchRow[]>({
    queryKey: QueryKeys.Lender.GET_PROFILE_BATCHES(
      chainId,
      normalizedAddress,
      normalizedMarketIds,
    ),
    enabled:
      !!normalizedAddress &&
      isHinterlightSupported(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const accountIds = normalizedMarketIds.map(
        (marketId) => `LENDER-${marketId.toLowerCase()}-${normalizedAddress}`,
      )

      const result = await client.query<
        LenderProfileBatchesQuery,
        AccountIdsVariables
      >({
        query: GET_LENDER_PROFILE_BATCHES,
        variables: {
          accountIds,
        },
      })

      return result.data.lenderWithdrawalStatuses.map((status) => {
        const price = priceMap[status.account.market.id] ?? 0
        const requested =
          toHumanAmount(
            status.totalNormalizedRequests,
            status.account.market.asset.decimals,
          ) * price
        const withdrawn =
          toHumanAmount(
            status.normalizedAmountWithdrawn,
            status.account.market.asset.decimals,
          ) * price

        return {
          id: status.batch.id,
          marketId: status.account.market.id,
          marketName: status.account.market.name,
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
