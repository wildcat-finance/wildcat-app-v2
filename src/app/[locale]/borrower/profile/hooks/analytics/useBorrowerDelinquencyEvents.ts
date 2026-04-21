import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerDelinquencyEvent } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_BORROWER_DELINQUENCY_EVENTS = gql`
  query getBorrowerDelinquencyEvents($marketIds: [String!]!) {
    delinquencyStatusChangeds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: 1000
    ) {
      market {
        id
      }
      isDelinquent
      blockTimestamp
    }
  }
`

type BorrowerDelinquencyEventsQuery = {
  delinquencyStatusChangeds: Array<{
    market: {
      id: string
    }
    isDelinquent: boolean
    blockTimestamp: number
  }>
}

type BorrowerDelinquencyEventsVariables = {
  marketIds: string[]
}

export const useBorrowerDelinquencyEvents = (
  borrowerAddress: `0x${string}` | undefined,
  marketIds: string[],
  gracePeriodMap: Record<string, number>,
  nameMap: Record<string, string>,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])

  return useQuery<BorrowerDelinquencyEvent[]>({
    queryKey: QueryKeys.Borrower.GET_PROFILE_DELINQUENCY(
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
        BorrowerDelinquencyEventsQuery,
        BorrowerDelinquencyEventsVariables
      >({
        query: GET_BORROWER_DELINQUENCY_EVENTS,
        variables: {
          marketIds: normalizedMarketIds,
        },
      })

      const eventsByMarket = new Map<
        string,
        BorrowerDelinquencyEventsQuery["delinquencyStatusChangeds"]
      >()

      result.data.delinquencyStatusChangeds.forEach((event) => {
        const existing = eventsByMarket.get(event.market.id) ?? []
        existing.push(event)
        eventsByMarket.set(event.market.id, existing)
      })

      const normalizedEvents: BorrowerDelinquencyEvent[] = []

      eventsByMarket.forEach((events, marketId) => {
        const gracePeriod = gracePeriodMap[marketId] ?? 0
        type OpenEvent = {
          index: number
          startedAt: number
        }
        const openEvent = events.reduce<OpenEvent | null>(
          (currentOpenEvent, event) => {
            if (event.isDelinquent) {
              return {
                index: normalizedEvents.length + 1,
                startedAt: event.blockTimestamp,
              }
            }

            if (!currentOpenEvent) return currentOpenEvent

            const duration = event.blockTimestamp - currentOpenEvent.startedAt

            normalizedEvents.push({
              id: currentOpenEvent.index,
              marketId,
              marketName: nameMap[marketId] ?? marketId,
              startTimestamp: currentOpenEvent.startedAt,
              endTimestamp: event.blockTimestamp,
              durationHours: Math.round(duration / 3600),
              penalized: duration > gracePeriod,
            })

            return null
          },
          null,
        )

        if (!openEvent) return

        const now = Math.floor(Date.now() / 1000)
        const duration = now - openEvent.startedAt

        normalizedEvents.push({
          id: openEvent.index,
          marketId,
          marketName: nameMap[marketId] ?? marketId,
          startTimestamp: openEvent.startedAt,
          endTimestamp: null,
          durationHours: Math.round(duration / 3600),
          penalized: duration > gracePeriod,
        })
      })

      return normalizedEvents.sort(
        (left, right) => left.startTimestamp - right.startTimestamp,
      )
    },
  })
}
