import { useState } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketRecordKind,
  getMarketRecords,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { logger } from "@/lib/logging/client"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export type UseMarketRecordsProps = {
  market: Market
  page: number
  pageSize: number
  kinds?: MarketRecordKind[]
  search?: string
}

export function useMarketRecords({
  market,
  page,
  pageSize,
  kinds,
  search,
}: UseMarketRecordsProps) {
  const [finalEventIndex, setFinalEventIndex] = useState(market.eventIndex)
  const subgraphClient = useSubgraphClient()

  const getMarketRecordsInternal = async () => {
    if (finalEventIndex === undefined) {
      logger.error(
        { market: market.address },
        "Failed to retrieve market records: event index is undefined",
      )
      throw Error(
        `Failed to retrieve market records, likely an error in the subgraph`,
      )
    }
    const endEventIndex = Math.max(0, finalEventIndex - page * pageSize)
    logger.debug(
      {
        finalEventIndex,
        endEventIndex,
        page,
        pageSize,
        kinds,
      },
      "Market records pagination",
    )

    const records = await getMarketRecords(subgraphClient, {
      market,
      fetchPolicy: "network-only",
      endEventIndex: finalEventIndex,
      limit: 500,
      kinds: kinds?.length ? kinds : undefined,
    })

    logger.debug(
      {
        recordsCount: records.length,
        startEventIndex: endEventIndex - pageSize,
        endEventIndex,
      },
      "Market records window",
    )

    const newestEventIndex = Math.max(
      ...records.slice(0, pageSize).map((r) => r.eventIndex + 1),
    )
    if (newestEventIndex > finalEventIndex) {
      setFinalEventIndex(newestEventIndex)
    }
    records.sort((a, b) => b.eventIndex - a.eventIndex)

    const q = search?.trim().toLowerCase()

    const filtered = q
      ? records.filter((r) => {
          const haystack = [r.transactionHash, String(r.eventIndex)]
            .filter(Boolean)
            .map((x) => String(x).toLowerCase())

          return haystack.some((s) => s.includes(q))
        })
      : records

    const startIndex = page * pageSize
    const endIndex = startIndex + pageSize

    return {
      records: filtered.slice(startIndex, endIndex),
      totalRecords: filtered.length,
    }
  }

  const { data, isLoading, error, isError } = useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_RECORDS(
      market.chainId,
      market.address,
      page,
      pageSize,
      kinds,
      search ?? "",
    ),
    queryFn: getMarketRecordsInternal,
    enabled: true,
    refetchOnMount: false,
  })

  return {
    data,
    isLoading,
    pagesCount:
      finalEventIndex === undefined
        ? undefined
        : Math.ceil(finalEventIndex / pageSize),
    isError,
    error,
    finalEventIndex,
  }
}
