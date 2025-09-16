import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getArchControllerContract } from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_IS_REGISTERED_BORROWER_KEY = "get-is-registered-borrower"

export const useGetIsRegisteredBorrower = () => {
  const { provider, signer, isWrongNetwork, address, chainId } =
    useEthersProvider()
  const signerOrProvider = signer ?? provider

  async function getIsRegisteredBorrower() {
    if (!signerOrProvider) throw Error(`Signer undefined`)
    if (!address) throw Error(`user address undefined`)
    if (!chainId) throw Error(`chain id undefined`)
    const archController = getArchControllerContract(chainId, signerOrProvider)
    return archController.isRegisteredBorrower(address)
  }

  return useQuery({
    queryKey: [GET_IS_REGISTERED_BORROWER_KEY, address],
    queryFn: getIsRegisteredBorrower,
    enabled: !!signerOrProvider && !isWrongNetwork && !!address,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })
}
