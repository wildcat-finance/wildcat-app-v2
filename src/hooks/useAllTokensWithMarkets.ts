import { useQuery } from "@tanstack/react-query"
import { getAllTokensWithMarkets } from "@wildcatfi/wildcat-sdk"

import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const GET_ALL_TOKENS_WITH_MARKETS_KEY = "get-all-tokens-with-markets"

export const useAllTokensWithMarkets = () => {
  const subgraphClient = useSubgraphClient()
  async function getTokens() {
    const data = await getAllTokensWithMarkets(subgraphClient)
    return data
  }
  return useQuery({
    queryKey: [GET_ALL_TOKENS_WITH_MARKETS_KEY],
    queryFn: getTokens,
  })
}
