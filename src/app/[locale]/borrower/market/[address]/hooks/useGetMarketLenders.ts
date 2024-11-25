import { useQuery } from "@tanstack/react-query"
import { getActiveLendersByMarket, Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_MARKET_LENDERS_KEY = `GET_MARKET_LENDERS_KEY`

export const useGetMarketLenders = (market?: Market) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork } = useEthersProvider()
  const { address } = useAccount()

  function getMarketLenders() {
    return getActiveLendersByMarket(SubgraphClient, {
      fetchPolicy: "network-only",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      market: market as any,
    })
  }

  return useQuery({
    queryKey: [GET_MARKET_LENDERS_KEY, chainId, market?.address],
    queryFn: getMarketLenders,
    refetchInterval: POLLING_INTERVAL,
    enabled: address && market && !isWrongNetwork,
    refetchOnMount: false,
  })
}
