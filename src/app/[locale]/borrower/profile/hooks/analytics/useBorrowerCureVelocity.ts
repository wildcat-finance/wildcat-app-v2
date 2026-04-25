import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerCureVelocityData } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { toHumanAmount } from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const PAGE_SIZE = 1000
const MAX_PROTOCOL_MEDIAN_EVENTS = 10_000

const GET_BORROWER_CURE_VELOCITY = gql`
  query getBorrowerCureVelocity($marketIds: [String!]!) {
    delinquencyStatusChangeds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: 1000
    ) {
      id
      isDelinquent
      liquidityCoverageRequired
      totalAssets
      blockTimestamp
      market {
        id
        name
        asset {
          decimals
        }
      }
    }
    marketInterestAccrueds(
      where: { market_in: $marketIds }
      orderBy: fromTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market {
        id
        asset {
          decimals
        }
      }
      fromTimestamp
      toTimestamp
      timeWithPenalties
      delinquencyFeesAccrued
    }
  }
`

const GET_PROTOCOL_DELINQUENCY_EVENTS = gql`
  query getProtocolDelinquencyEvents($first: Int!, $skip: Int!) {
    delinquencyStatusChangeds(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: asc
    ) {
      isDelinquent
      blockTimestamp
      market {
        id
      }
    }
  }
`

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

type BorrowerCureVelocityQuery = {
  delinquencyStatusChangeds: DelinquencyStatusChangedRaw[]
  marketInterestAccrueds: MarketInterestAccruedRaw[]
}

type ProtocolDelinquencyEventsQuery = {
  delinquencyStatusChangeds: Array<{
    isDelinquent: boolean
    blockTimestamp: number
    market: {
      id: string
    }
  }>
}

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

  events.forEach((event) => {
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

const fetchProtocolDelinquencyEvents = async (
  client: NonNullable<ReturnType<typeof getHinterlightClient>>,
  skip = 0,
  events: ProtocolDelinquencyEventsQuery["delinquencyStatusChangeds"] = [],
): Promise<ProtocolDelinquencyEventsQuery["delinquencyStatusChangeds"]> => {
  if (skip >= MAX_PROTOCOL_MEDIAN_EVENTS) return events

  const page = await client.query<ProtocolDelinquencyEventsQuery>({
    query: GET_PROTOCOL_DELINQUENCY_EVENTS,
    variables: { first: PAGE_SIZE, skip },
  })
  const nextEvents = [...events, ...page.data.delinquencyStatusChangeds]

  if (page.data.delinquencyStatusChangeds.length < PAGE_SIZE) {
    return nextEvents
  }

  return fetchProtocolDelinquencyEvents(client, skip + PAGE_SIZE, nextEvents)
}

export const useBorrowerCureVelocity = ({
  borrowerAddress,
  marketIds,
  priceMap,
  gracePeriodMap,
}: {
  borrowerAddress: `0x${string}` | undefined
  marketIds: string[]
  priceMap: Record<string, number>
  gracePeriodMap: Record<string, number>
}) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap])
  const stableGraceMapKey = useMemo(
    () => JSON.stringify(gracePeriodMap),
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
      isHinterlightSupported(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const [borrowerResult, protocolEvents] = await Promise.all([
        client.query<BorrowerCureVelocityQuery>({
          query: GET_BORROWER_CURE_VELOCITY,
          variables: { marketIds: normalizedMarketIds },
        }),
        fetchProtocolDelinquencyEvents(client),
      ])

      const accrualsByMarket = new Map<string, MarketInterestAccruedRaw[]>()
      borrowerResult.data.marketInterestAccrueds.forEach((accrual) => {
        const existing = accrualsByMarket.get(accrual.market.id) ?? []
        existing.push(accrual)
        accrualsByMarket.set(accrual.market.id, existing)
      })

      const openByMarket = new Map<string, DelinquencyStatusChangedRaw>()
      const points: BorrowerCureVelocityData["points"] = []

      borrowerResult.data.delinquencyStatusChangeds.forEach((event) => {
        if (event.isDelinquent) {
          openByMarket.set(event.market.id, event)
          return
        }

        const start = openByMarket.get(event.market.id)
        if (!start) return

        const price = priceMap[start.market.id] ?? 0
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
            ) * (priceMap[accrual.market.id] ?? 0)
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
