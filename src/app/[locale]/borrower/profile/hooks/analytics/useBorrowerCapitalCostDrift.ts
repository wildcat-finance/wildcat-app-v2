import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerCapitalCostPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_BORROWER_CAPITAL_COST_DRIFT = gql`
  query getBorrowerCapitalCostDrift($borrower: Bytes!, $marketIds: [String!]!) {
    borrowerDailyStats: borrowerDailyStats_collection(
      where: { borrower: $borrower }
      orderBy: startTimestamp
      orderDirection: asc
      first: 1000
    ) {
      startTimestamp
      dayBaseInterestAccruedUSD
      dayDelinquencyFeesAccruedUSD
      dayProtocolFeesAccruedUSD
    }
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
        annualInterestBips
        originalAnnualInterestBips
        asset {
          decimals
        }
      }
    }
    annualInterestBipsUpdateds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market {
        id
      }
      oldAnnualInterestBips
      newAnnualInterestBips
      blockTimestamp
    }
  }
`

type BorrowerDailyStatsRaw = {
  startTimestamp: number
  dayBaseInterestAccruedUSD: string
  dayDelinquencyFeesAccruedUSD: string
  dayProtocolFeesAccruedUSD: string
}

type MarketDailyStatsRaw = {
  startTimestamp: number
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
  market: {
    id: string
    annualInterestBips: number
    originalAnnualInterestBips: number
    asset: {
      decimals: number
    }
  }
}

type AnnualInterestBipsUpdatedRaw = {
  market: {
    id: string
  }
  oldAnnualInterestBips: number
  newAnnualInterestBips: number
  blockTimestamp: number
}

type BorrowerCapitalCostDriftQuery = {
  borrowerDailyStats: BorrowerDailyStatsRaw[]
  marketDailyStats: MarketDailyStatsRaw[]
  annualInterestBipsUpdateds: AnnualInterestBipsUpdatedRaw[]
}

const getAprAtTimestamp = (
  marketId: string,
  timestamp: number,
  initialAprByMarket: Map<string, number>,
  updatesByMarket: Map<string, AnnualInterestBipsUpdatedRaw[]>,
) => {
  const updates = updatesByMarket.get(marketId) ?? []
  let apr =
    updates[0]?.oldAnnualInterestBips ?? initialAprByMarket.get(marketId) ?? 0

  updates.forEach((update) => {
    if (update.blockTimestamp <= timestamp) {
      apr = update.newAnnualInterestBips
    }
  })

  return apr / 100
}

export const useBorrowerCapitalCostDrift = ({
  borrowerAddress,
  marketIds,
  priceMap,
  chainId: externalChainId,
}: {
  borrowerAddress: `0x${string}` | undefined
  marketIds: string[]
  priceMap: Record<string, number>
  chainId?: number
}) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap])

  return useQuery<BorrowerCapitalCostPoint[]>({
    queryKey: [
      ...QueryKeys.Borrower.GET_PROFILE_ANALYTICS(chainId, normalizedAddress),
      "capital-cost-drift",
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
      if (!normalizedAddress) throw new Error("Missing borrower address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const result = await client.query<BorrowerCapitalCostDriftQuery>({
        query: GET_BORROWER_CAPITAL_COST_DRIFT,
        variables: {
          borrower: normalizedAddress,
          marketIds: normalizedMarketIds,
        },
      })

      const initialAprByMarket = new Map<string, number>()
      const debtByDay = new Map<number, Map<string, number>>()

      result.data.marketDailyStats.forEach((entry) => {
        const marketId = entry.market.id
        initialAprByMarket.set(
          marketId,
          entry.market.originalAnnualInterestBips ||
            entry.market.annualInterestBips,
        )

        const debtToken = toHumanAmount(
          normalizeScaledAmount(entry.scaledTotalSupply, entry.scaleFactor),
          entry.market.asset.decimals,
        )
        const price = entry.usdPrice
          ? Number(entry.usdPrice)
          : priceMap[marketId] ?? 0
        const dayDebt = debtByDay.get(entry.startTimestamp) ?? new Map()
        dayDebt.set(marketId, debtToken * price)
        debtByDay.set(entry.startTimestamp, dayDebt)
      })

      const updatesByMarket = new Map<string, AnnualInterestBipsUpdatedRaw[]>()
      result.data.annualInterestBipsUpdateds.forEach((update) => {
        const updates = updatesByMarket.get(update.market.id) ?? []
        updates.push(update)
        updatesByMarket.set(update.market.id, updates)
      })

      const lastDebtByMarket = new Map<string, number>()

      return result.data.borrowerDailyStats.map((point) => {
        const dayDebt = debtByDay.get(point.startTimestamp)
        dayDebt?.forEach((debt, marketId) => {
          lastDebtByMarket.set(marketId, debt)
        })

        let totalDebtUsd = 0
        let weightedApr = 0
        lastDebtByMarket.forEach((debt, marketId) => {
          totalDebtUsd += debt
          weightedApr +=
            debt *
            getAprAtTimestamp(
              marketId,
              point.startTimestamp,
              initialAprByMarket,
              updatesByMarket,
            )
        })

        const baseInterest = Number(point.dayBaseInterestAccruedUSD) || 0
        const delinquencyFees = Number(point.dayDelinquencyFeesAccruedUSD) || 0
        const protocolFees = Number(point.dayProtocolFeesAccruedUSD) || 0
        const totalDailyCost = baseInterest + delinquencyFees + protocolFees

        return {
          date: formatDateLabel(point.startTimestamp),
          dateShort: formatShortDate(point.startTimestamp),
          timestamp: point.startTimestamp,
          baseInterest,
          delinquencyFees,
          protocolFees,
          statedApr: totalDebtUsd > 0 ? weightedApr / totalDebtUsd : 0,
          effectiveApr:
            totalDebtUsd > 0 ? (totalDailyCost / totalDebtUsd) * 365 * 100 : 0,
          totalDebtUsd,
        }
      })
    },
  })
}
