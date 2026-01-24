import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketRecordKind,
  getMarketRecords,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

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
  const { eventIndex } = market

  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId
  const subgraphClient = getSubgraphClient(targetChainId)

  const getMarketRecordsInternal = async () => {
    if (eventIndex === undefined) {
      console.error(
        `Failed to retrieve market records: Market event index is undefined`,
      )
      throw Error(
        `Failed to retrieve market records, likely an error in the subgraph`,
      )
    }

    const records = await getMarketRecords(subgraphClient, {
      market,
      fetchPolicy: "network-only",
      endEventIndex: eventIndex,
      limit: 500,
      kinds: kinds?.length ? kinds : undefined,
    })

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
    // eventIndex in query key ensures auto-refetch when market updates
    queryKey: QueryKeys.Markets.GET_MARKET_RECORDS(
      market.chainId,
      market.address,
      eventIndex,
      page,
      pageSize,
      kinds,
      search ?? "",
    ),
    queryFn: getMarketRecordsInternal,
    enabled: eventIndex !== undefined,
    refetchOnMount: false,
  })

  return {
    data,
    isLoading,
    pagesCount:
      eventIndex === undefined ? undefined : Math.ceil(eventIndex / pageSize),
    isError,
    error,
  }
}
