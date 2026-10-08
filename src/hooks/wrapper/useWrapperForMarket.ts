import { useEffect } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  getSubgraphClient,
  hasDeploymentAddress,
  SupportedChainId,
  Market,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

type UseWrapperForMarketResult = {
  wrapper: TokenWrapper | undefined
  wrapperAddress: string | undefined
  hasWrapper: boolean
  hasFactory: boolean
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export const useWrapperForMarket = (
  market: Market | undefined,
): UseWrapperForMarketResult => {
  const { provider, signer } = useEthersProvider({ chainId: market?.chainId })
  const signerOrProvider = signer ?? provider

  const chainId = market?.chainId as SupportedChainId | undefined
  const hasFactory =
    !!chainId && hasDeploymentAddress(chainId, "Wildcat4626WrapperFactory")

  const query = useQuery({
    queryKey: QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(
      chainId ?? 0,
      market?.address,
    ),
    enabled: !!market && !!signerOrProvider && hasFactory,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!market || !signerOrProvider || !chainId) throw new Error("No market")
      const wrapper = await TokenWrapper.fromMarketWithSubgraph(
        getSubgraphClient(chainId),
        {
          chainId,
          signerOrProvider,
          market: market.address,
          // React Query owns refresh/invalidation, including after creation.
          fetchPolicy: "network-only",
          fallbackToFactory: true,
        },
      )
      // React Query treats undefined as a failed query, not an absent wrapper.
      return wrapper ?? null
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const wrapper =
    hasFactory && signerOrProvider ? query.data ?? undefined : undefined

  useEffect(() => {
    if (wrapper && signerOrProvider && wrapper.provider !== signerOrProvider) {
      wrapper.provider = signerOrProvider
    }
  }, [wrapper, signerOrProvider])

  return {
    wrapper,
    wrapperAddress: wrapper?.address,
    hasWrapper: !!wrapper,
    hasFactory,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    refetch: query.refetch,
  }
}
