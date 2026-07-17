import { useEffect, useMemo } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getIndexedMarket,
  getSubgraphClient,
  isSupportedChainId,
  Market,
  MarketVersion,
  type SignerOrProvider,
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

export const getMarketApiQueryKey = (
  addressLower: string | undefined,
  chainId?: number,
) => ["market", "apiGet", addressLower, chainId ?? "discover"] as const

export async function fetchApiMarket(addressLower: string, chainId?: number) {
  const url = new URL("/api/market/get", window.location.origin)
  url.searchParams.set("address", addressLower)
  if (typeof chainId === "number" && Number.isFinite(chainId)) {
    url.searchParams.set("chainId", String(chainId))
  }

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch market via api")
  return (await res.json()) as ApiResponse
}

async function refreshMarketForDetail(
  chainId: number,
  market: Market,
  signerOrProvider: SignerOrProvider,
) {
  if (market.version !== MarketVersion.V2 || !isSupportedChainId(chainId)) {
    await market.update()
    return market
  }

  try {
    const [refreshedMarket] = await refreshMarketsV2LiveDataSafe(
      chainId,
      [market],
      signerOrProvider,
    )
    return refreshedMarket ?? market
  } catch (_) {
    await market.update()
    return market
  }
}

export function useGetMarket({ address, chainId }: UseMarketProps) {
  const queryClient = useQueryClient()
  const marketAddressLower = address?.toLowerCase()

  const api = useQuery({
    queryKey: getMarketApiQueryKey(marketAddressLower, chainId),
    enabled: !!marketAddressLower,
    queryFn: () => fetchApiMarket(marketAddressLower!, chainId),
    staleTime: 5 * 60 * 1000, // 5min
    refetchOnWindowFocus: false,
  })

  const effectiveChainId = api.data?.chainId ?? undefined
  const discoveredMarket = api.data?.market ?? null
  const performanceContext = {
    address: marketAddressLower,
    chainId: effectiveChainId ?? chainId,
  }

  useMarketDetailPerformanceMark(
    "api-market-ready",
    performanceContext,
    !!effectiveChainId && !!discoveredMarket,
  )

  const { signer, provider } = useEthersProvider({
    chainId:
      typeof effectiveChainId === "number" ? effectiveChainId : undefined,
  })
  const signerOrProvider = signer || provider

  const marketQueryKey = useMemo(
    () =>
      QueryKeys.Markets.GET_MARKET(effectiveChainId ?? 0, marketAddressLower),
    [effectiveChainId, marketAddressLower],
  )

  const query = useQuery({
    queryKey: marketQueryKey,
    enabled:
      !!marketAddressLower &&
      !!effectiveChainId &&
      !!discoveredMarket &&
      !!signerOrProvider,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (
        typeof effectiveChainId !== "number" ||
        !isSupportedChainId(effectiveChainId) ||
        !discoveredMarket ||
        !signerOrProvider
      ) {
        throw Error()
      }

      const subgraphClient = getSubgraphClient(effectiveChainId)
      const market = await getIndexedMarket(subgraphClient, {
        chainId: effectiveChainId,
        signerOrProvider,
        market: discoveredMarket.id,
        fetchPolicy: "network-only",
      })
      if (!market) throw Error(`Market not found: ${discoveredMarket.id}`)

      return refreshMarketForDetail(effectiveChainId, market, signerOrProvider)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  useMarketDetailPerformanceMark(
    "live-market-ready",
    performanceContext,
    !!query.data,
  )

  useEffect(() => {
    if (
      query.data &&
      signerOrProvider &&
      query.data.provider !== signerOrProvider
    ) {
      const nextMarket = cloneSdkObject(query.data)
      nextMarket.provider = signerOrProvider
      queryClient.setQueryData(marketQueryKey, nextMarket)
    }
  }, [marketQueryKey, query.data, queryClient, signerOrProvider])

  return {
    ...query,
    isDiscoveringChainId: api.isLoading,
    discoveredChainId: effectiveChainId,
    apiError: api.error,
    apiLoading: api.isLoading,
  }
}
