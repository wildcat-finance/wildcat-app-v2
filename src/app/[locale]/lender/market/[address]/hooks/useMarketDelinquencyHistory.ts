import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"
import { Market, getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"

const GET_MARKET_DELINQUENCY_EVENTS = gql`
  query getMarketDelinquencyEvents(
    $market: String!
    $first: Int!
    $skip: Int!
  ) {
    delinquencyStatusChangeds(
      where: { market: $market }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      id
      isDelinquent
      blockTimestamp
      transactionHash
    }
  }
`

type MarketDelinquencyEventsQuery = {
  delinquencyStatusChangeds: Array<{
    id: string
    isDelinquent: boolean
    blockTimestamp: number
    transactionHash: string
  }>
}

type MarketDelinquencyEventsVariables = {
  market: string
  first: number
  skip: number
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

function toDelinquencyHistory(
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

  events.forEach((event) => {
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

export function useMarketDelinquencyHistory(market: Market | undefined) {
  const marketAddress = market?.address.toLowerCase()
  const gracePeriodSeconds = market?.delinquencyGracePeriod ?? 0

  const subgraphClient = useMemo(
    () => (market ? getSubgraphClient(market.chainId) : undefined),
    [market],
  )

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_DELINQUENCY_HISTORY(
      market?.chainId ?? 0,
      marketAddress,
      gracePeriodSeconds,
    ),
    enabled: !!marketAddress && !!subgraphClient,
    refetchInterval: 60_000,
    refetchOnMount: false,
    queryFn: async () => {
      if (!marketAddress || !subgraphClient) throw new Error("Missing data")

      const pageSize = 1000
      const fetchPage = async (
        skip: number,
      ): Promise<MarketDelinquencyEventsQuery["delinquencyStatusChangeds"]> => {
        const result = await subgraphClient.query<
          MarketDelinquencyEventsQuery,
          MarketDelinquencyEventsVariables
        >({
          query: GET_MARKET_DELINQUENCY_EVENTS,
          variables: { market: marketAddress, first: pageSize, skip },
        })

        const page = result.data.delinquencyStatusChangeds
        if (page.length < pageSize) return page

        return [...page, ...(await fetchPage(skip + pageSize))]
      }

      const allEvents = await fetchPage(0)

      return toDelinquencyHistory(allEvents, gracePeriodSeconds)
    },
  })

  return {
    delinquencyHistory: data ?? [],
    isLoading,
    gracePeriodHours: toHours(gracePeriodSeconds),
  }
}
