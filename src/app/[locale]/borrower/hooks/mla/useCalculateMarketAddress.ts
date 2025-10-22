import { useQuery } from "@tanstack/react-query"
import { getHooksFactoryContract } from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

export const CALCULATE_MARKET_ADDRESS_KEY = "CALCULATE_MARKET_ADDRESS"

export const useCalculateMarketAddress = (salt: string) => {
  const { provider, chain } = useEthersProvider()
  return useQuery({
    queryKey: [CALCULATE_MARKET_ADDRESS_KEY, salt],
    enabled: !!salt && !!provider && !!chain,
    queryFn: async () => {
      if (!provider || !chain) throw new Error("Provider is required")
      const hooksFactoryContract = getHooksFactoryContract(chain.id, provider)
      return hooksFactoryContract.computeMarketAddress(salt)
    },
  })
}
