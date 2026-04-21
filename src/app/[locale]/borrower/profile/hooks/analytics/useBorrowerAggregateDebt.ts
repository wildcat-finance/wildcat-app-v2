import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerAggregateDebtPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_BORROWER_AGGREGATE_DEBT = gql`
  query getBorrowerAggregateDebt($marketIds: [String!]!) {
    marketDailyStats: marketDailyStats_collection(
      where: { market_in: $marketIds }
      orderBy: startTimestamp
      orderDirection: asc
      first: 1000
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

type MarketDailyStatsRaw = {
  startTimestamp: number
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
  market: {
    id: string
    asset: { decimals: number }
  }
}

type BorrowerAggregateDebtQuery = {
  marketDailyStats: MarketDailyStatsRaw[]
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
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap])

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

      const result = await client.query<BorrowerAggregateDebtQuery>({
        query: GET_BORROWER_AGGREGATE_DEBT,
        variables: { marketIds: normalizedMarketIds },
      })

      // Group raw stats by day so we can roll every market into a single
      // stacked point per timestamp.
      const byDay = new Map<number, Map<string, number>>()
      const seenMarkets = new Set<string>()

      result.data.marketDailyStats.forEach((entry) => {
        const marketId = entry.market.id
        seenMarkets.add(marketId)

        const debtToken = toHumanAmount(
          normalizeScaledAmount(entry.scaledTotalSupply, entry.scaleFactor),
          entry.market.asset.decimals,
        )
        const historicalPrice = entry.usdPrice ? Number(entry.usdPrice) : null
        const fallbackPrice = priceMap[marketId] ?? 0
        const price =
          historicalPrice && Number.isFinite(historicalPrice)
            ? historicalPrice
            : fallbackPrice
        const debtUsd = debtToken * price

        const dayBucket = byDay.get(entry.startTimestamp) ?? new Map()
        dayBucket.set(marketId, debtUsd)
        byDay.set(entry.startTimestamp, dayBucket)
      })

      const orderedMarketIds = Array.from(seenMarkets).sort((left, right) =>
        (nameMap[left] ?? left).localeCompare(nameMap[right] ?? right),
      )

      const points: BorrowerAggregateDebtPoint[] = Array.from(byDay.entries())
        .sort(([left], [right]) => left - right)
        .map(([timestamp, marketDebts]) => {
          const point: BorrowerAggregateDebtPoint = {
            date: formatDateLabel(timestamp),
            dateShort: formatShortDate(timestamp),
            timestamp,
            totalDebtUsd: 0,
          }

          let total = 0
          orderedMarketIds.forEach((marketId) => {
            const debt = marketDebts.get(marketId) ?? 0
            point[marketId] = debt
            total += debt
          })

          point.totalDebtUsd = total
          return point
        })

      return { points, marketIds: orderedMarketIds }
    },
  })
}
