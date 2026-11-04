import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"
import {
  DEFAULT_DELINQUENCY_PERIOD,
  getMarketDefaultStatus,
  getSubgraphClient,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

// A default needs a delinquency that ran past the grace period for 90 more days,
// so markets never delinquent or younger than that are skipped before the
// (per-market) history replay
const DEFAULT_CANDIDATES_QUERY = gql`
  query getDefaultCandidates($first: Int!, $skip: Int!, $createdBefore: Int!) {
    markets(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: asc
      where: {
        delinquencyStatusChangedIndex_gt: 0
        createdAt_lt: $createdBefore
      }
    ) {
      id
      borrower
      lastInterestAccruedTimestamp
    }
  }
`

type DefaultCandidate = {
  id: string
  borrower: string
  lastInterestAccruedTimestamp: number
}

export type DefaultedMarket = {
  address: string
  borrower: string
  defaultedAt?: number
}

type DefaultedMarketsData = {
  // Keyed by lowercased market address
  markets: Record<string, DefaultedMarket>
  // Markets whose history could not be established; they keep their live status
  unknown: string[]
}

const CANDIDATES_PAGE_SIZE = 1000
const MAX_CONCURRENT_HISTORY_READS = 6
const REFRESH_INTERVAL = 5 * 60_000

const fetchDefaultedMarkets = async (
  chainId: SupportedChainId,
  signal: AbortSignal,
): Promise<DefaultedMarketsData> => {
  const client = getSubgraphClient(chainId)
  const createdBefore =
    Math.floor(Date.now() / 1000) - DEFAULT_DELINQUENCY_PERIOD

  const candidates: DefaultCandidate[] = []
  for (let skip = 0; ; skip += CANDIDATES_PAGE_SIZE) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await client.query<{ markets: DefaultCandidate[] }>({
      query: DEFAULT_CANDIDATES_QUERY,
      variables: { first: CANDIDATES_PAGE_SIZE, skip, createdBefore },
      fetchPolicy: "network-only",
      context: { fetchOptions: { signal } },
    })
    candidates.push(...data.markets)
    if (data.markets.length < CANDIDATES_PAGE_SIZE) break
  }

  const markets: DefaultedMarketsData["markets"] = {}
  const unknown: string[] = []
  let nextIndex = 0

  // Bounded so a chain with many candidates cannot flood the subgraph
  const readNext = async (): Promise<void> => {
    if (signal.aborted || nextIndex === candidates.length) return
    const candidate = candidates[nextIndex]
    nextIndex += 1
    const address = candidate.id.toLowerCase()
    try {
      const status = await getMarketDefaultStatus(client, {
        market: {
          address,
          chainId,
          lastInterestAccruedTimestamp: candidate.lastInterestAccruedTimestamp,
        },
        signal,
      })
      if (status.isDefaulted === undefined) unknown.push(address)
      else if (status.isDefaulted)
        markets[address] = {
          address,
          borrower: candidate.borrower.toLowerCase(),
          defaultedAt: status.defaultedAt,
        }
    } catch {
      if (!signal.aborted) unknown.push(address)
    }
    await readNext()
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(MAX_CONCURRENT_HISTORY_READS, candidates.length),
      },
      readNext,
    ),
  )

  return { markets, unknown }
}

/**
 * Historical defaults on a chain, from the SDK's history replay. A default stays
 * recorded after cure or closure. Until the first read finishes nothing counts
 * as defaulted, so callers should treat `isLoading` as "status not known yet".
 */
export const useDefaultedMarkets = (chainId?: number) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const targetChainId = (chainId ?? selectedChainId) as SupportedChainId

  const query = useQuery({
    queryKey: QueryKeys.Markets.GET_DEFAULTED_MARKETS(targetChainId),
    queryFn: ({ signal }) => fetchDefaultedMarkets(targetChainId, signal),
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  return useMemo(() => {
    const markets = query.data?.markets ?? {}
    const byBorrower: Record<string, string[]> = {}
    Object.values(markets).forEach((market) => {
      byBorrower[market.borrower] = [
        ...(byBorrower[market.borrower] ?? []),
        market.address,
      ]
    })

    return {
      isLoading: query.isLoading,
      isError: query.isError,
      defaultedMarkets: markets,
      isDefaulted: (marketAddress?: string) =>
        !!marketAddress && marketAddress.toLowerCase() in markets,
      defaultedAt: (marketAddress?: string) =>
        marketAddress
          ? markets[marketAddress.toLowerCase()]?.defaultedAt
          : undefined,
      defaultedMarketsOfBorrower: (borrowerAddress?: string) =>
        (borrowerAddress && byBorrower[borrowerAddress.toLowerCase()]) || [],
    }
  }, [query.data, query.isLoading, query.isError])
}
