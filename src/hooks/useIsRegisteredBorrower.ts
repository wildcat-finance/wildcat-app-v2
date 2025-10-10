import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getArchControllerContract } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const useGetIsRegisteredBorrower = () => {
  const { provider, signer, isWrongNetwork, address, chainId } =
    useEthersProvider()
  const signerOrProvider = signer ?? provider
  const chainKey = chainId ?? 0

  async function getIsRegisteredBorrower() {
    if (!signerOrProvider) throw Error(`Signer undefined`)
    if (!address) throw Error(`user address undefined`)
    if (!chainId) throw Error(`chain id undefined`)
    const archController = getArchControllerContract(chainId, signerOrProvider)
    return archController.isRegisteredBorrower(address)
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_IS_REGISTERED_BORROWER(chainKey, address),
    queryFn: getIsRegisteredBorrower,
    enabled: !!signerOrProvider && !isWrongNetwork && !!address && !!chainId,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })
}
