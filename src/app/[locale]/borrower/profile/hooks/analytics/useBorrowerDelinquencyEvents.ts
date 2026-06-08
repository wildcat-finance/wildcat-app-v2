import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerDelinquencyEvent } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"
import { fetchAllGraphqlPages } from "@/lib/paginated-query"

const GET_BORROWER_DELINQUENCY_EVENTS = gql`
  query getBorrowerDelinquencyEvents(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    delinquencyStatusChangeds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
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
  externalChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
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
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const delinquencyStatusChangeds = await fetchAllGraphqlPages<
        BorrowerDelinquencyEventsQuery,
        BorrowerDelinquencyEventsVariables,
        BorrowerDelinquencyEventsQuery["delinquencyStatusChangeds"][number]
      >({
        client,
        query: GET_BORROWER_DELINQUENCY_EVENTS,
        variables: {
          marketIds: normalizedMarketIds,
        },
        getItems: (page) => page.delinquencyStatusChangeds,
      })

      const eventsByMarket = new Map<
        string,
        BorrowerDelinquencyEventsQuery["delinquencyStatusChangeds"]
      >()

      delinquencyStatusChangeds.forEach((event) => {
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
