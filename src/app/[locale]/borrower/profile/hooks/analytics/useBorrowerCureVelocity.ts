import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getDelinquencyStatusChangePage,
  getMarketInterestAccrualPage,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerCureVelocityData } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  stableRecordKey,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

type DelinquencyStatusChangedRaw = {
  id: string
  isDelinquent: boolean
  liquidityCoverageRequired: string
  totalAssets: string
  blockTimestamp: number
  market: {
    id: string
    name: string
    asset: {
      decimals: number
    }
  }
}

type MarketInterestAccruedRaw = {
  market: {
    id: string
    asset: {
      decimals: number
    }
  }
  fromTimestamp: number
  toTimestamp: number
  timeWithPenalties: number
  delinquencyFeesAccrued: string
}

type ProtocolDelinquencyEvent = Pick<
  DelinquencyStatusChangedRaw,
  "isDelinquent" | "blockTimestamp" | "market"
>

const getMedian = (values: number[]) => {
  if (values.length === 0) return null

  const sorted = values.slice().sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

const getCureDurations = (
  events: Array<{
    isDelinquent: boolean
    blockTimestamp: number
    market: { id: string }
  }>,
) => {
  const openStarts = new Map<string, number>()
  const durations: number[] = []

  events
    .slice()
    .sort((left, right) => left.blockTimestamp - right.blockTimestamp)
    .forEach((event) => {
      if (event.isDelinquent) {
        openStarts.set(event.market.id, event.blockTimestamp)
        return
      }

      const startedAt = openStarts.get(event.market.id)
      if (!startedAt) return

      durations.push((event.blockTimestamp - startedAt) / 3600)
      openStarts.delete(event.market.id)
    })

  return durations
}

export const useBorrowerCureVelocity = ({
  borrowerAddress,
  marketIds,
  priceMap,
  gracePeriodMap,
  chainId: externalChainId,
}: {
  borrowerAddress: `0x${string}` | undefined
  marketIds: string[]
  priceMap: Record<string, number>
  gracePeriodMap: Record<string, number>
  chainId?: number
}) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])
  const stableGraceMapKey = useMemo(
    () => stableRecordKey(gracePeriodMap),
    [gracePeriodMap],
  )

  return useQuery<BorrowerCureVelocityData>({
    queryKey: [
      ...QueryKeys.Borrower.GET_PROFILE_DELINQUENCY(
        chainId,
        normalizedAddress,
        normalizedMarketIds,
      ),
      "cure-velocity",
      stablePriceMapKey,
      stableGraceMapKey,
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

      const [indexedBorrowerEvents, indexedAccruals, indexedProtocolEvents] =
        await Promise.all([
          collectIndexedPages(
            (request) =>
              getDelinquencyStatusChangePage(client, {
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getMarketInterestAccrualPage(client, {
                markets: normalizedMarketIds,
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
          collectIndexedPages(
            (request) =>
              getDelinquencyStatusChangePage(client, {
                fetchPolicy: "network-only",
                ...request,
              }),
            { first: 1000 },
          ),
        ])
      const delinquencyStatusChangeds: DelinquencyStatusChangedRaw[] =
        indexedBorrowerEvents.map((event) => ({
          id: event.id,
          isDelinquent: event.isDelinquent,
          liquidityCoverageRequired: event.liquidityCoverageRequired.toString(),
          totalAssets: event.totalAssets.toString(),
          blockTimestamp: Number(event.blockTimestamp),
          market: {
            id: event.market.address,
            name: event.market.name,
            asset: { decimals: event.market.asset.decimals },
          },
        }))
      const marketInterestAccrueds: MarketInterestAccruedRaw[] =
        indexedAccruals.map((accrual) => ({
          market: {
            id: accrual.market.address,
            asset: { decimals: accrual.market.asset.decimals },
          },
          fromTimestamp: accrual.fromTimestamp,
          toTimestamp: accrual.toTimestamp,
          timeWithPenalties: accrual.timeWithPenalties,
          delinquencyFeesAccrued: accrual.delinquencyFeesAccrued.toString(),
        }))
      const protocolEvents: ProtocolDelinquencyEvent[] =
        indexedProtocolEvents.map((event) => ({
          isDelinquent: event.isDelinquent,
          blockTimestamp: Number(event.blockTimestamp),
          market: {
            id: event.market.address,
            name: event.market.name,
            asset: { decimals: event.market.asset.decimals },
          },
        }))

      const getMarketPrice = (marketId: string) => {
        const price = priceMap[marketId]
        if (price === undefined) {
          throw new Error(`Missing USD price for market ${marketId}`)
        }
        return price
      }

      const accrualsByMarket = new Map<string, MarketInterestAccruedRaw[]>()
      marketInterestAccrueds.forEach((accrual) => {
        const existing = accrualsByMarket.get(accrual.market.id) ?? []
        existing.push(accrual)
        accrualsByMarket.set(accrual.market.id, existing)
      })

      const openByMarket = new Map<string, DelinquencyStatusChangedRaw>()
      const points: BorrowerCureVelocityData["points"] = []

      delinquencyStatusChangeds
        .slice()
        .sort((left, right) => left.blockTimestamp - right.blockTimestamp)
        .forEach((event) => {
          if (event.isDelinquent) {
            openByMarket.set(event.market.id, event)
            return
          }

          const start = openByMarket.get(event.market.id)
          if (!start) return

          const price = getMarketPrice(start.market.id)
          const severityRaw =
            BigInt(start.liquidityCoverageRequired) - BigInt(start.totalAssets)
          const zero = BigInt(0)
          const severityUsd =
            toHumanAmount(
              severityRaw > zero ? severityRaw : zero,
              start.market.asset.decimals,
            ) * price
          const eventAccruals = accrualsByMarket.get(start.market.id) ?? []
          const matchingAccruals = eventAccruals.filter(
            (accrual) =>
              accrual.toTimestamp > start.blockTimestamp &&
              accrual.fromTimestamp < event.blockTimestamp,
          )
          const delinquencyFeesUsd = matchingAccruals.reduce((sum, accrual) => {
            const fee =
              toHumanAmount(
                accrual.delinquencyFeesAccrued,
                accrual.market.asset.decimals,
              ) * getMarketPrice(accrual.market.id)
            return sum + fee
          }, 0)
          const cureHours = (event.blockTimestamp - start.blockTimestamp) / 3600

          points.push({
            id: start.id,
            marketId: start.market.id,
            marketName: start.market.name,
            startTimestamp: start.blockTimestamp,
            endTimestamp: event.blockTimestamp,
            severityUsd,
            cureHours,
            delinquencyFeesUsd,
            penalized:
              cureHours * 3600 > (gracePeriodMap[start.market.id] ?? 0) ||
              matchingAccruals.some((accrual) => accrual.timeWithPenalties > 0),
          })
          openByMarket.delete(event.market.id)
        })

      return {
        points,
        protocolMedianCureHours: getMedian(getCureDurations(protocolEvents)),
      }
    },
  })
}
