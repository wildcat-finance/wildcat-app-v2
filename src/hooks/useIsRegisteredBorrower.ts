import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getArchControllerContract } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_IS_REGISTERED_BORROWER_KEY = "get-is-registered-borrower"

export const useGetIsRegisteredBorrower = () => {
  const { provider, signer, isWrongNetwork, address } = useEthersProvider()
  const signerOrProvider = signer ?? provider

  async function getIsRegisteredBorrower() {
    if (!signerOrProvider) throw Error(`Signer undefined`)
    if (!address) throw Error(`user address undefined`)
    const archController = getArchControllerContract(
      TargetChainId,
      signerOrProvider,
    )
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
