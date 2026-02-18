import { useQuery } from "@tanstack/react-query"
import { getMarketChartsData, Market } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const useGetMarketChartsData = (market?: Market) => {
  const subgraphClient = useSubgraphClient()
  const { chainId } = useSelectedNetwork()
  const marketAddress = market?.address.toLowerCase()

  return useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_CHARTS_DATA(chainId, marketAddress),
    queryFn: () => {
      if (!market || !chainId) throw Error("Market or chainId not found")
      return getMarketChartsData(subgraphClient, {
        chainId: market.chainId,
        fetchPolicy: "network-only",
        market,
      })
    },
    enabled: !!market && !!chainId,
    refetchOnMount: false,
    refetchInterval: POLLING_INTERVAL,
  })
}
