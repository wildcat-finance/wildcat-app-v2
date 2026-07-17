import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  DelinquencyStatusChange,
  getDelinquencyStatusChangePage,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerDelinquencyEvent } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
} from "@/lib/subgraphCapabilities"

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
    enabled:
      isSubgraphAnalyticsConfigured(chainId) && normalizedMarketIds.length > 0,
    refetchOnMount: false,
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const delinquencyStatusChangeds = await collectIndexedPages(
        (request) =>
          getDelinquencyStatusChangePage(client, {
            markets: normalizedMarketIds,
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )

      const eventsByMarket = new Map<string, DelinquencyStatusChange[]>()

      delinquencyStatusChangeds.forEach((event) => {
        const existing = eventsByMarket.get(event.market.address) ?? []
        existing.push(event)
        eventsByMarket.set(event.market.address, existing)
      })

      const normalizedEvents: BorrowerDelinquencyEvent[] = []

      eventsByMarket.forEach((events, marketId) => {
        events.sort(
          (left, right) =>
            Number(left.blockTimestamp) - Number(right.blockTimestamp),
        )
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
                startedAt: Number(event.blockTimestamp),
              }
            }

            if (!currentOpenEvent) return currentOpenEvent

            const eventTimestamp = Number(event.blockTimestamp)
            const duration = eventTimestamp - currentOpenEvent.startedAt

            normalizedEvents.push({
              id: currentOpenEvent.index,
              marketId,
              marketName: nameMap[marketId] ?? marketId,
              startTimestamp: currentOpenEvent.startedAt,
              endTimestamp: eventTimestamp,
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
