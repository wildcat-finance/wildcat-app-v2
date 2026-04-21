import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerWithdrawalAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  relativeHoursUntil,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_BORROWER_WITHDRAWAL_BATCHES = gql`
  query getBorrowerWithdrawalBatches($marketIds: [String!]!) {
    withdrawalBatches(
      where: { market_in: $marketIds }
      orderBy: expiry
      orderDirection: asc
      first: 300
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
  withdrawalBatches: Array<{
    id: string
    expiry: string
    isExpired: boolean
    isClosed: boolean
    totalNormalizedRequests: string
    market: {
      id: string
      name: string
      asset: {
        decimals: number
      }
    }
    expiration: {
      normalizedAmountPaid: string
      normalizedAmountOwed: string
    } | null
  }>
}

type BorrowerWithdrawalBatchesVariables = {
  marketIds: string[]
}

export const useBorrowerBatches = (
  borrowerAddress: `0x${string}` | undefined,
  marketIds: string[],
  priceMap: Record<string, number>,
) => {
  const { chainId } = useSelectedNetwork()
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
    staleTime: 60_000,
    queryFn: async () => {
      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const result = await client.query<
        BorrowerWithdrawalBatchesQuery,
        BorrowerWithdrawalBatchesVariables
      >({
        query: GET_BORROWER_WITHDRAWAL_BATCHES,
        variables: {
          marketIds: normalizedMarketIds,
        },
      })

      let pendingBatches = 0
      let totalQueued = 0
      let nextExpiryTimestamp = Number.POSITIVE_INFINITY

      const settledBatches = result.data.withdrawalBatches.reduce<
        BorrowerWithdrawalAnalytics["batches"]
      >((batches, batch) => {
        const price = priceMap[batch.market.id] ?? 0
        const requested =
          toHumanAmount(
            batch.totalNormalizedRequests,
            batch.market.asset.decimals,
          ) * price

        if (!batch.isExpired && !batch.isClosed) {
          pendingBatches += 1
          totalQueued += requested
          nextExpiryTimestamp = Math.min(
            nextExpiryTimestamp,
            Number(batch.expiry),
          )
          return batches
        }

        const shortfall = batch.expiration
          ? toHumanAmount(
              batch.expiration.normalizedAmountOwed,
              batch.market.asset.decimals,
            ) * price
          : 0

        let status: BorrowerWithdrawalAnalytics["batches"][number]["status"] =
          "paid"
        if (shortfall > 0.01) {
          status = batch.isClosed ? "paid-late" : "unpaid"
        }

        batches.push({
          id: batch.id,
          marketName: batch.market.name,
          label: `#${batches.length + 1}`,
          expiryTimestamp: Number(batch.expiry),
          requested,
          paid: status === "paid" ? requested : 0,
          paidLate: status === "paid-late" ? requested : 0,
          unpaid: status === "unpaid" ? requested : 0,
          shortfall,
          status,
        })

        return batches
      }, [])

      const underpaidBatches = settledBatches.filter(
        (batch) => batch.shortfall > 0.01,
      )

      return {
        totalExpired: settledBatches.length,
        fullyPaidPct:
          settledBatches.length > 0
            ? Math.round(
                (settledBatches.filter((batch) => batch.status === "paid")
                  .length /
                  settledBatches.length) *
                  100,
              )
            : 100,
        paidLateCount: settledBatches.filter(
          (batch) => batch.status === "paid-late",
        ).length,
        unpaidCount: settledBatches.filter((batch) => batch.status === "unpaid")
          .length,
        avgShortfallPct:
          underpaidBatches.length > 0
            ? Math.round(
                underpaidBatches.reduce((sum, batch) => {
                  if (batch.requested === 0) return sum
                  return sum + (batch.shortfall / batch.requested) * 100
                }, 0) / underpaidBatches.length,
              )
            : 0,
        pendingBatches,
        totalQueued,
        nextExpiry:
          nextExpiryTimestamp < Number.POSITIVE_INFINITY
            ? relativeHoursUntil(nextExpiryTimestamp)
            : "—",
        batches: settledBatches,
      }
    },
  })
}
