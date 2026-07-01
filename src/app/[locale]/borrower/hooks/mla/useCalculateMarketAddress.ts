import { useQuery } from "@tanstack/react-query"
import {
  getHooksFactoryContract,
  getHooksFactoryRevolvingContract,
  MarketType,
} from "@wildcatfi/wildcat-sdk"

import { useEthersProvider } from "@/hooks/useEthersSigner"

export const CALCULATE_MARKET_ADDRESS_KEY = "CALCULATE_MARKET_ADDRESS"

export const calculateMarketAddress = async ({
  chainId,
  provider,
  salt,
  marketType,
}: {
  chainId: number
  provider: Parameters<typeof getHooksFactoryContract>[1]
  salt: string
  marketType: MarketType
}) => {
  const hooksFactoryContract =
    marketType === "revolving"
      ? getHooksFactoryRevolvingContract(chainId, provider)
      : getHooksFactoryContract(chainId, provider)
  return hooksFactoryContract.computeMarketAddress(salt)
}

export const useCalculateMarketAddress = (
  salt: string,
  marketType: MarketType,
) => {
  const { provider, chain } = useEthersProvider()
  return useQuery({
    queryKey: [CALCULATE_MARKET_ADDRESS_KEY, chain?.id, marketType, salt],
    enabled: !!salt && !!provider && !!chain,
    queryFn: async () => {
      if (!provider || !chain) throw new Error("Provider is required")
      return calculateMarketAddress({
        chainId: chain.id,
        provider,
        salt,
        marketType,
      })
    },
  })
}
