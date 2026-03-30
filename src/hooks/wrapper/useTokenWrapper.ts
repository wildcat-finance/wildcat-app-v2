import { useQuery } from "@tanstack/react-query"
import { SupportedChainId, TokenWrapper } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const useTokenWrapper = (
  chainId: SupportedChainId | undefined,
  wrapperAddress: string | undefined,
) => {
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider

  return useQuery({
    queryKey: QueryKeys.Wrapper.GET_WRAPPER(chainId ?? 0, wrapperAddress),
    enabled: !!chainId && !!wrapperAddress && !!signerOrProvider,
    queryFn: async () => {
      if (!chainId || !wrapperAddress || !signerOrProvider)
        throw new Error("Missing wrapper params")
      return TokenWrapper.fromAddress(chainId, signerOrProvider, wrapperAddress)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
