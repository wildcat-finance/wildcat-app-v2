import { useEffect } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketVersion,
  getLensContract,
  getLensV2Contract,
} from "@wildcatfi/wildcat-sdk"
import type { SubgraphGetMarketQuery } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export type UseMarketProps = {
  address: string | undefined
  chainId?: number
}

type ApiResponse = {
  chainId: number | null
  market: NonNullable<SubgraphGetMarketQuery["market"]> | null
}

async function fetchApiMarket(addressLower: string, chainId?: number) {
  const url = new URL("/api/market/get", window.location.origin)
  url.searchParams.set("address", addressLower)
  if (typeof chainId === "number" && Number.isFinite(chainId)) {
    url.searchParams.set("chainId", String(chainId))
  }

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch market via api")
  return (await res.json()) as ApiResponse
}

export function useGetMarket({ address, chainId }: UseMarketProps) {
  const marketAddressLower = address?.toLowerCase()

  const api = useQuery({
    queryKey: ["market", "apiGet", marketAddressLower, chainId ?? "discover"],
    enabled: !!marketAddressLower,
    queryFn: () => fetchApiMarket(marketAddressLower!, chainId),
    staleTime: 5 * 60 * 1000, // 5min
    refetchOnWindowFocus: false,
  })

  const effectiveChainId = api.data?.chainId ?? undefined
  const subgraphMarket = api.data?.market ?? null

  const { signer, provider } = useEthersProvider({
    chainId:
      typeof effectiveChainId === "number" ? effectiveChainId : undefined,
  })
  const signerOrProvider = signer || provider

  const query = useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET(
      effectiveChainId ?? 0,
      marketAddressLower,
    ),
    enabled:
      !!marketAddressLower &&
      !!effectiveChainId &&
      !!subgraphMarket &&
      !!signerOrProvider,
    refetchInterval: POLLING_INTERVALS.default,
    queryFn: async () => {
      if (!effectiveChainId || !subgraphMarket || !signerOrProvider)
        throw Error()

      const market = Market.fromSubgraphMarketData(
        effectiveChainId,
        signerOrProvider,
        subgraphMarket,
      )

      if (market.version === MarketVersion.V1) {
        const lens = getLensContract(effectiveChainId, signerOrProvider)
        const update = await lens.getMarketData(market.address)
        market.updateWith(update)
      } else {
        const lens = getLensV2Contract(effectiveChainId, signerOrProvider)
        const update = await lens.getMarketData(market.address)
        market.updateWith(update)
      }

      return market
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (
      query.data &&
      signerOrProvider &&
      query.data.provider !== signerOrProvider
    ) {
      query.data.provider = signerOrProvider
    }
  }, [query.data, signerOrProvider])

  return {
    ...query,
    isDiscoveringChainId: api.isLoading,
    discoveredChainId: effectiveChainId,
    apiError: api.error,
    apiLoading: api.isLoading,
  }
}
