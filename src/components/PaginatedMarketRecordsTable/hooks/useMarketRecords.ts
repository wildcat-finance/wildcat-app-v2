import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketRecord,
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
const SUBGRAPH_DEFAULT_END_EVENT_INDEX = 999_999_999
export const MARKET_RECORDS_QUERY_STALE_TIME = 60 * 1000

export type MarketRecordsPageResult = {
  records: MarketRecord[]
  totalRecords: number
}

export const getMarketRecordsQueryKey = ({
  market,
  page,
  pageSize,
  kinds,
  search,
}: UseMarketRecordsProps) =>
  QueryKeys.Markets.GET_MARKET_RECORDS(
    market.chainId,
    market.address,
    page,
    pageSize,
    kinds,
    search ?? "",
  )

export async function fetchMarketRecordsPage({
  market,
  page,
  pageSize,
  kinds,
  search,
  targetChainId,
}: UseMarketRecordsProps & {
  targetChainId?: number
}): Promise<MarketRecordsPageResult> {
  const subgraphClient = getSubgraphClient(targetChainId ?? market.chainId)
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

export function useMarketRecords({
  market,
  page,
  pageSize,
  kinds,
  search,
}: UseMarketRecordsProps) {
  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId

  const getMarketRecordsInternal = async () =>
    fetchMarketRecordsPage({
      market,
      page,
      pageSize,
      kinds,
      search,
      targetChainId,
    })

  const { data, isLoading, error, isError } = useQuery({
    queryKey: getMarketRecordsQueryKey({
      market,
      page,
      pageSize,
      kinds,
      search,
    }),
    queryFn: getMarketRecordsInternal,
    refetchOnMount: false,
    staleTime: MARKET_RECORDS_QUERY_STALE_TIME,
    refetchInterval: 2 * 60 * 1000, // 2min
  })

  let pagesCount: number | undefined
  if (data?.totalRecords) {
    pagesCount = Math.ceil(data.totalRecords / pageSize)
  } else if (market.eventIndex) {
    pagesCount = Math.ceil(market.eventIndex / pageSize)
  }

  return {
    data,
    isLoading,
    pagesCount,
    isError,
    error,
  }
}
