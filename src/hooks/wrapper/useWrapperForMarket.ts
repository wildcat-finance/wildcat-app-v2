import { useQuery } from "@tanstack/react-query"
import {
  hasDeploymentAddress,
  SupportedChainId,
  Market,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

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
  const subgraphClient = useSubgraphClient()

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
      return TokenWrapper.fromMarketWithSubgraph(subgraphClient, {
        chainId,
        signerOrProvider,
        market: market.address,
        fetchPolicy: "cache-first",
        fallbackToFactory: true,
      })
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const wrapper = query.data
  const wrapperAddress = wrapper?.address
  const hasWrapper = !!wrapper

  return {
    wrapper,
    wrapperAddress,
    hasWrapper,
    hasFactory,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    refetch: query.refetch,
  }
}
