import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getDelinquencyStatusChangePage,
  Market,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import {
  getConfiguredSubgraphClient,
  isSubgraphAnalyticsConfigured,
} from "@/lib/subgraphCapabilities"

type MarketDelinquencyEventsQuery = {
  delinquencyStatusChangeds: Array<{
    id: string
    isDelinquent: boolean
    blockTimestamp: number
    transactionHash: string
  }>
}

export type DelinquencyHistoryPoint = {
  id: string
  eventNumber: number
  label: string
  startTimestamp: number
  endTimestamp: number | null
  startDate: string
  endDate: string | null
  durationSeconds: number
  durationHours: number
  graceHours: number
  penaltyHours: number
  isActive: boolean
  isPenalized: boolean
  transactionHash: string
}

const formatDateISO = (timestamp: number) =>
  new Date(timestamp * 1000).toISOString().slice(0, 10)

const formatDateShort = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

const toHours = (seconds: number) => seconds / 3600

export function toDelinquencyHistory(
  events: MarketDelinquencyEventsQuery["delinquencyStatusChangeds"],
  gracePeriodSeconds: number,
): DelinquencyHistoryPoint[] {
  const now = Math.floor(Date.now() / 1000)
  const gracePeriodHours = toHours(gracePeriodSeconds)
  const points: DelinquencyHistoryPoint[] = []
  let open: {
    id: string
    timestamp: number
    transactionHash: string
  } | null = null

  events
    .slice()
    .sort((left, right) => left.blockTimestamp - right.blockTimestamp)
    .forEach((event) => {
      if (event.isDelinquent) {
        open = {
          id: event.id,
          timestamp: event.blockTimestamp,
          transactionHash: event.transactionHash,
        }
        return
      }

      if (!open) return

      const durationSeconds = Math.max(0, event.blockTimestamp - open.timestamp)
      const durationHours = toHours(durationSeconds)
      const eventNumber = points.length + 1

      points.push({
        id: open.id,
        eventNumber,
        label: formatDateShort(open.timestamp),
        startTimestamp: open.timestamp,
        endTimestamp: event.blockTimestamp,
        startDate: formatDateISO(open.timestamp),
        endDate: formatDateISO(event.blockTimestamp),
        durationSeconds,
        durationHours,
        graceHours: Math.min(durationHours, gracePeriodHours),
        penaltyHours: Math.max(durationHours - gracePeriodHours, 0),
        isActive: false,
        isPenalized: durationSeconds > gracePeriodSeconds,
        transactionHash: open.transactionHash,
      })
      open = null
    })

  const lastOpen = open as {
    id: string
    timestamp: number
    transactionHash: string
  } | null

  if (lastOpen) {
    const durationSeconds = Math.max(0, now - lastOpen.timestamp)
    const durationHours = toHours(durationSeconds)
    const eventNumber = points.length + 1

    points.push({
      id: lastOpen.id,
      eventNumber,
      label: `#${eventNumber} ${formatDateShort(lastOpen.timestamp)}`,
      startTimestamp: lastOpen.timestamp,
      endTimestamp: null,
      startDate: formatDateISO(lastOpen.timestamp),
      endDate: null,
      durationSeconds,
      durationHours,
      graceHours: Math.min(durationHours, gracePeriodHours),
      penaltyHours: Math.max(durationHours - gracePeriodHours, 0),
      isActive: true,
      isPenalized: durationSeconds > gracePeriodSeconds,
      transactionHash: lastOpen.transactionHash,
    })
  }

  return points
}

export function useMarketDelinquencyHistory(
  market: Market | undefined,
  enabled = true,
) {
  const marketAddress = market?.address.toLowerCase()
  const gracePeriodSeconds = market?.delinquencyGracePeriod ?? 0

  const subgraphClient = useMemo(
    () => getConfiguredSubgraphClient(market?.chainId),
    [market],
  )

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_DELINQUENCY_HISTORY(
      market?.chainId ?? 0,
      marketAddress,
      gracePeriodSeconds,
    ),
    enabled:
      enabled &&
      !!marketAddress &&
      !!subgraphClient &&
      isSubgraphAnalyticsConfigured(market?.chainId),
    refetchInterval: 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!marketAddress || !subgraphClient) throw new Error("Missing data")

      const indexedEvents = await collectIndexedPages(
        (request) =>
          getDelinquencyStatusChangePage(subgraphClient, {
            markets: [marketAddress],
            fetchPolicy: "network-only",
            ...request,
          }),
        { first: 1000 },
      )
      const allEvents: MarketDelinquencyEventsQuery["delinquencyStatusChangeds"] =
        indexedEvents.map((event) => ({
          id: event.id,
          isDelinquent: event.isDelinquent,
          blockTimestamp: Number(event.blockTimestamp),
          transactionHash: event.transactionHash,
        }))

      return toDelinquencyHistory(allEvents, gracePeriodSeconds)
    },
  })

  return {
    delinquencyHistory: data ?? [],
    isLoading,
    gracePeriodHours: toHours(gracePeriodSeconds),
  }
}
