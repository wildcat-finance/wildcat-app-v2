import { useQuery } from "@tanstack/react-query"
import { getAllTokensWithMarkets } from "@wildcatfi/wildcat-sdk"

import { SubgraphClient } from "@/config/subgraph"

export const GET_ALL_TOKENS_WITH_MARKETS_KEY = "get-all-tokens-with-markets"

export const useAllTokensWithMarkets = () => {
  async function getTokens() {
    const data = await getAllTokensWithMarkets(SubgraphClient)
    return data
  }
  return useQuery({
    queryKey: [GET_ALL_TOKENS_WITH_MARKETS_KEY],
    queryFn: getTokens,
  })
}
