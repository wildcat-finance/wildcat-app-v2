import { useQuery } from "@tanstack/react-query"
import {
  DeployableMarketKind,
  getHooksFactoryContractForMarketKind,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

export const CALCULATE_MARKET_ADDRESS_KEY = "CALCULATE_MARKET_ADDRESS"

export const calculateMarketAddress = async ({
  chainId,
  provider,
  salt,
  marketKind,
}: {
  chainId: number
  provider: SignerOrProvider
  salt: string
  marketKind: DeployableMarketKind
}) => {
  const hooksFactoryContract = getHooksFactoryContractForMarketKind(
    chainId,
    marketKind,
    provider,
  )
  return hooksFactoryContract.computeMarketAddress(salt)
}

export const useCalculateMarketAddress = (
  salt: string,
  marketKind: DeployableMarketKind,
) => {
  const { provider, chain } = useEthersProvider()
  return useQuery({
    queryKey: [CALCULATE_MARKET_ADDRESS_KEY, chain?.id, marketKind, salt],
    enabled: !!salt && !!provider && !!chain,
    queryFn: async () => {
      if (!provider || !chain) throw new Error("Provider is required")
      return calculateMarketAddress({
        chainId: chain.id,
        provider,
        salt,
        marketKind,
      })
    },
  })
}
