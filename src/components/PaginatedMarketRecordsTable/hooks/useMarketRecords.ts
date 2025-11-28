import { useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketRecordKind,
  getMarketRecords,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export type UseMarketRecordsProps = {
  market: Market
  page: number
  pageSize: number
  kinds?: MarketRecordKind[]
  search?: string
  enabled?: boolean
}

export function useMarketRecords({
  market,
  page,
  pageSize,
  kinds,
  search,
  enabled = true,
}: UseMarketRecordsProps) {
  const [finalEventIndex, setFinalEventIndex] = useState(market.eventIndex)
  const subgraphClient = useSubgraphClient()

  const getMarketRecordsInternal = async () => {
    if (finalEventIndex === undefined) {
      console.error(
        `Failed to retrieve market records: Market event index is undefined`,
      )
      throw Error(
        `Failed to retrieve market records, likely an error in the subgraph`,
      )
    }
    const endEventIndex = Math.max(0, finalEventIndex - page * pageSize)
    console.log(finalEventIndex, "finalEventIndex")
    console.log(`END EVENT INDEX: ${endEventIndex}`)
    console.log(`Page: ${page}`)
    console.log(kinds)
    console.log(`Page Size: ${pageSize}`)

    const records = await getMarketRecords(subgraphClient, {
      market,
      fetchPolicy: "network-only",
      endEventIndex: finalEventIndex,
      limit: 500,
      kinds: kinds?.length ? kinds : undefined,
    })

    console.log(`Records: ${records.length}`)

    console.log(`Start Event Index: ${endEventIndex - pageSize}`)
    console.log(`End Event Index: ${endEventIndex}`)

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
    enabled,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
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
