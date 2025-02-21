import { useQuery } from "@tanstack/react-query"
import { getHooksFactoryContract } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const CALCULATE_MARKET_ADDRESS_KEY = "CALCULATE_MARKET_ADDRESS"

export const useCalculateMarketAddress = (salt: string) => {
  const { provider } = useEthersProvider()
  return useQuery({
    queryKey: [CALCULATE_MARKET_ADDRESS_KEY, salt],
    enabled: !!salt && !!provider,
    queryFn: async () => {
      if (!provider) throw new Error("Provider is required")
      const hooksFactoryContract = getHooksFactoryContract(
        TargetChainId,
        provider,
      )
      return hooksFactoryContract.computeMarketAddress(salt)
    },
  })
}
