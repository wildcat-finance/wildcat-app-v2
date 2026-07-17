import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getAnnualInterestBipsUpdatePage,
  getBorrowerDailyStatsPage,
  getMarketDailyStatsPage,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerCapitalCostPoint } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  stableRecordKey,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

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
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<BorrowerCapitalCostPoint[]>({
    queryKey: [
      ...QueryKeys.Borrower.GET_PROFILE_ANALYTICS(chainId, normalizedAddress),
      "capital-cost-drift",
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
      if (!normalizedAddress) throw new Error("Missing borrower address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const [indexedBorrowerStats, indexedMarketStats, indexedAprUpdates] =
        await Promise.all([
          collectIndexedPages(
            (request) =>
              getBorrowerDailyStatsPage(client, {
                borrower: normalizedAddress,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getMarketDailyStatsPage(client, {
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getAnnualInterestBipsUpdatePage(client, {
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
        ])
      const borrowerDailyStats: BorrowerDailyStatsRaw[] = indexedBorrowerStats
        .slice()
        .sort((left, right) => left.startTimestamp - right.startTimestamp)
      const marketDailyStats: MarketDailyStatsRaw[] = indexedMarketStats.map(
        (point) => ({
          startTimestamp: point.startTimestamp,
          scaledTotalSupply: point.scaledTotalSupply.toString(),
          scaleFactor: point.scaleFactor.toString(),
          usdPrice: point.usdPrice ?? null,
          market: {
            id: point.market.address,
            annualInterestBips: point.market.annualInterestBips,
            originalAnnualInterestBips: point.market.originalAnnualInterestBips,
            asset: { decimals: point.market.asset.decimals },
          },
        }),
      )
      const annualInterestBipsUpdateds: AnnualInterestBipsUpdatedRaw[] =
        indexedAprUpdates.map((update) => ({
          market: { id: update.market.address },
          oldAnnualInterestBips: update.oldAnnualInterestBips,
          newAnnualInterestBips: update.newAnnualInterestBips,
          blockTimestamp: Number(update.blockTimestamp),
        }))

      const initialAprByMarket = new Map<string, number>()
      const debtByDay = new Map<number, Map<string, number>>()

      marketDailyStats.forEach((entry) => {
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
          : priceMap[marketId]
        if (price === undefined || !Number.isFinite(price)) {
          throw new Error(`Missing USD price for market ${marketId}`)
        }
        const dayDebt = debtByDay.get(entry.startTimestamp) ?? new Map()
        dayDebt.set(marketId, debtToken * price)
        debtByDay.set(entry.startTimestamp, dayDebt)
      })

      const updatesByMarket = new Map<string, AnnualInterestBipsUpdatedRaw[]>()
      annualInterestBipsUpdateds.forEach((update) => {
        const updates = updatesByMarket.get(update.market.id) ?? []
        updates.push(update)
        updatesByMarket.set(update.market.id, updates)
      })
      updatesByMarket.forEach((updates) => {
        updates.sort(
          (left, right) => left.blockTimestamp - right.blockTimestamp,
        )
      })

      const lastDebtByMarket = new Map<string, number>()

      return borrowerDailyStats.map((point) => {
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
