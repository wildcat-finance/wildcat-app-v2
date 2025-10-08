import { useQuery } from "@tanstack/react-query"
import { getAllTokensWithMarkets } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

import { useSelectedNetwork } from "./useSelectedNetwork"

export const useAllTokensWithMarkets = () => {
  const subgraphClient = useSubgraphClient()
  const { chainId: targetChainId } = useSelectedNetwork()
  async function getTokens() {
    const data = await getAllTokensWithMarkets(subgraphClient)
    return data
  }
  return useQuery({
    queryKey: QueryKeys.Markets.GET_ALL_TOKENS_WITH_MARKETS(targetChainId),
    queryFn: getTokens,
  })
}
