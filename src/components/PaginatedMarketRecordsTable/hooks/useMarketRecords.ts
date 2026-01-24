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
const SUBGRAPH_DEFAULT_END_EVENT_INDEX = 100_000_000

export function useMarketRecords({
  market,
  page,
  pageSize,
  kinds,
  search,
}: UseMarketRecordsProps) {
  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId
  const subgraphClient = getSubgraphClient(targetChainId)

  const getMarketRecordsInternal = async () => {
    const records = await getMarketRecords(subgraphClient, {
      market,
      fetchPolicy: "network-only",
      endEventIndex: SUBGRAPH_DEFAULT_END_EVENT_INDEX,
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
    queryKey: QueryKeys.Markets.GET_MARKET_RECORDS(
      market.chainId,
      market.address,
      page,
      pageSize,
      kinds,
      search ?? "",
    ),
    queryFn: getMarketRecordsInternal,
    refetchOnMount: false,
  })

  return {
    data,
    isLoading,
    // use totalRecords from the actual response for accurate pagination
    pagesCount: data?.totalRecords
      ? Math.ceil(data.totalRecords / pageSize)
      : undefined,
    isError,
    error,
  }
}
