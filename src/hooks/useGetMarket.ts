import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  getIndexedMarket,
  getSubgraphClient,
  isSupportedChainId,
  Market,
  MarketVersion,
  type SignerOrProvider,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useMarketDetailPerformanceMark } from "@/hooks/useMarketDetailPerformance"
import { cloneSdkObject } from "@/lib/sdk-object"
import { refreshMarketsV2LiveDataSafe } from "@/utils/marketV2Reads"

export type UseMarketProps = {
  address: string | undefined
  chainId?: number
}

type ApiResponse = {
  chainId: number | null
  market: { id: string } | null
}

export const INDEXED_MARKET_REFRESH_INTERVAL = 60_000
export const MARKET_DETAIL_INITIAL_RETRY_INTERVAL = 1_000
export const MARKET_DETAIL_MAX_RETRY_INTERVAL = 30_000

export const getMarketDetailRetryInterval = ({
  dataUpdateCount,
  errorUpdateCount,
}: {
  dataUpdateCount: number
  errorUpdateCount: number
}) => {
  const attempts = Math.max(dataUpdateCount, errorUpdateCount, 1)
  const exponent = Math.min(attempts - 1, 30)
  return Math.min(
    MARKET_DETAIL_INITIAL_RETRY_INTERVAL * 2 ** exponent,
    MARKET_DETAIL_MAX_RETRY_INTERVAL,
  )
}

export class MarketDetailUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MarketDetailUnavailableError"
  }
}

export const getMarketApiQueryKey = (addressLower: string | undefined) =>
  ["market", "apiGet", addressLower, "discover"] as const

export async function fetchApiMarket(addressLower: string) {
  const url = new URL("/api/market/get", window.location.origin)
  url.searchParams.set("address", addressLower)

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch market via api")
  return (await res.json()) as ApiResponse
}

type IndexedMarketQueryOptionsInput = {
  chainId: SupportedChainId
  marketAddress: string
  signerOrProvider: SignerOrProvider
}

export async function fetchIndexedMarketForDetail({
  chainId,
  marketAddress,
  signerOrProvider,
}: IndexedMarketQueryOptionsInput) {
  const subgraphClient = getSubgraphClient(chainId)
  const market = await getIndexedMarket(subgraphClient, {
    chainId,
    signerOrProvider,
    market: marketAddress,
    shouldSkipRecords: true,
    fetchPolicy: "network-only",
  })

  if (!market) {
    throw new MarketDetailUnavailableError(
      `Market not found or not indexed: ${marketAddress}`,
    )
  }

  return market
}

export const getIndexedMarketQueryOptions = (
  input: IndexedMarketQueryOptionsInput,
) => ({
  queryKey: QueryKeys.Markets.GET_INDEXED_MARKET(
    input.chainId,
    input.marketAddress,
  ),
  queryFn: () => fetchIndexedMarketForDetail(input),
  staleTime: INDEXED_MARKET_REFRESH_INTERVAL,
  retry: (failureCount: number, error: Error) =>
    !(error instanceof MarketDetailUnavailableError) && failureCount < 1,
  retryDelay: 250,
  refetchInterval: (query: {
    state: {
      data: Market | undefined
      dataUpdateCount: number
      errorUpdateCount: number
    }
  }) =>
    query.state.data
      ? INDEXED_MARKET_REFRESH_INTERVAL
      : getMarketDetailRetryInterval(query.state),
})

export const cloneMarketForLiveRefresh = (
  market: Market,
  signerOrProvider: SignerOrProvider,
) => {
  const marketForLiveRefresh = cloneSdkObject(market)

  // ContractWrapper.provider propagates to nested wrappers. Clone the tokens
  // before changing providers so the indexed React Query entry stays immutable.
  marketForLiveRefresh.marketToken = cloneSdkObject(market.marketToken)
  marketForLiveRefresh.underlyingToken = cloneSdkObject(market.underlyingToken)
  marketForLiveRefresh.provider = signerOrProvider

  return marketForLiveRefresh
}

export async function refreshMarketForDetail(
  chainId: SupportedChainId,
  market: Market,
  signerOrProvider: SignerOrProvider,
) {
  const marketForLiveRefresh = cloneMarketForLiveRefresh(
    market,
    signerOrProvider,
  )

  if (marketForLiveRefresh.version !== MarketVersion.V2) {
    await marketForLiveRefresh.update()
    return marketForLiveRefresh
  }

  const [refreshedMarket] = await refreshMarketsV2LiveDataSafe(
    chainId,
    [marketForLiveRefresh],
    signerOrProvider,
  )
  return refreshedMarket ?? marketForLiveRefresh
}

export function useGetMarket({ address, chainId }: UseMarketProps) {
  const marketAddressLower = address?.toLowerCase()
  const suppliedChainId =
    typeof chainId === "number" && isSupportedChainId(chainId)
      ? chainId
      : undefined
  const shouldDiscoverChain =
    !!marketAddressLower && typeof chainId !== "number"

  const discoveryQuery = useQuery({
    queryKey: getMarketApiQueryKey(marketAddressLower),
    enabled: shouldDiscoverChain,
    queryFn: () => fetchApiMarket(marketAddressLower!),
    staleTime: 5 * 60 * 1000, // 5min
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 250,
    refetchInterval: (query) => {
      const response = query.state.data
      const hasSupportedMarket =
        !!response?.market &&
        typeof response.chainId === "number" &&
        isSupportedChainId(response.chainId)

      return hasSupportedMarket
        ? false
        : getMarketDetailRetryInterval(query.state)
    },
  })

  const discoveredChainId =
    typeof discoveryQuery.data?.chainId === "number" &&
    isSupportedChainId(discoveryQuery.data.chainId)
      ? discoveryQuery.data.chainId
      : undefined
  const effectiveChainId = suppliedChainId ?? discoveredChainId
  const suppliedChainError = useMemo(
    () =>
      typeof chainId === "number" && !suppliedChainId
        ? new MarketDetailUnavailableError(`Unsupported chain: ${chainId}`)
        : null,
    [chainId, suppliedChainId],
  )
  const discoveryMissError = useMemo(
    () =>
      shouldDiscoverChain &&
      discoveryQuery.isSuccess &&
      (!discoveryQuery.data.market || !discoveredChainId)
        ? new MarketDetailUnavailableError(
            `Market not found on a supported chain: ${marketAddressLower}`,
          )
        : null,
    [
      discoveredChainId,
      discoveryQuery.data,
      discoveryQuery.isSuccess,
      marketAddressLower,
      shouldDiscoverChain,
    ],
  )
  const performanceContext = {
    address: marketAddressLower,
    chainId: effectiveChainId,
  }

  useMarketDetailPerformanceMark(
    "chain-ready",
    performanceContext,
    !!effectiveChainId,
  )

  const { signer, provider } = useEthersProvider({
    chainId: effectiveChainId,
  })
  const signerOrProvider = signer || provider

  const indexedQuery = useQuery({
    ...(effectiveChainId && marketAddressLower && signerOrProvider
      ? getIndexedMarketQueryOptions({
          chainId: effectiveChainId,
          marketAddress: marketAddressLower,
          signerOrProvider,
        })
      : {
          queryKey: QueryKeys.Markets.GET_INDEXED_MARKET(
            effectiveChainId ?? 0,
            marketAddressLower,
          ),
          queryFn: async () => {
            throw new MarketDetailUnavailableError(
              "Market detail prerequisites are unavailable",
            )
          },
          staleTime: INDEXED_MARKET_REFRESH_INTERVAL,
          retry: false,
        }),
    enabled:
      !!marketAddressLower &&
      !!effectiveChainId &&
      !!signerOrProvider &&
      !suppliedChainError &&
      !discoveryMissError,
    refetchOnWindowFocus: true,
  })

  useMarketDetailPerformanceMark(
    "indexed-market-ready",
    performanceContext,
    !!indexedQuery.data,
  )

  const liveQuery = useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET(
      effectiveChainId ?? 0,
      marketAddressLower,
    ),
    enabled: !!effectiveChainId && !!indexedQuery.data && !!signerOrProvider,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!effectiveChainId || !indexedQuery.data || !signerOrProvider) {
        throw new MarketDetailUnavailableError(
          "Market live-read prerequisites are unavailable",
        )
      }

      return refreshMarketForDetail(
        effectiveChainId,
        indexedQuery.data,
        signerOrProvider,
      )
    },
    retry: 1,
    retryDelay: 250,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  useMarketDetailPerformanceMark(
    "live-market-ready",
    performanceContext,
    !!liveQuery.data,
  )

  const error =
    suppliedChainError ??
    discoveryMissError ??
    (discoveryQuery.data ? null : discoveryQuery.error) ??
    (indexedQuery.data ? null : indexedQuery.error) ??
    (liveQuery.data ? null : liveQuery.error)
  const isAwaitingMarketData =
    !!marketAddressLower &&
    !suppliedChainError &&
    !liveQuery.data &&
    (!!discoveryMissError ||
      discoveryQuery.errorUpdateCount > 0 ||
      indexedQuery.errorUpdateCount > 0 ||
      liveQuery.errorUpdateCount > 0)
  const isLoading = !!marketAddressLower && !error && !liveQuery.data

  return {
    ...liveQuery,
    error,
    isError: !!error,
    isLoading,
    isDiscoveringChainId: discoveryQuery.isLoading,
    discoveredChainId: effectiveChainId,
    apiLoading: discoveryQuery.isLoading,
    isAwaitingMarketData,
  }
}
