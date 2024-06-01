import { useQuery } from "@tanstack/react-query"
import { Market, getLensContract } from "@wildcatfi/wildcat-sdk"
import {
  GetMarketDocument,
  SubgraphGetMarketQuery,
  SubgraphGetMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_MARKET_KEY = "get-market"

export type UseMarketProps = {
  marketAddress: string | undefined
} & Partial<Omit<SubgraphGetMarketQueryVariables, "market">>

export function useGetMarket({ marketAddress, ...filters }: UseMarketProps) {
  const { signer, provider, isWrongNetwork } = useEthersProvider()
  const marketAddressFormatted = marketAddress?.toLowerCase()
  const signerOrProvider = signer ?? provider

  async function queryMarket() {
    if (!marketAddressFormatted || !signerOrProvider) throw Error()

    const result = await SubgraphClient.query<
      SubgraphGetMarketQuery,
      SubgraphGetMarketQueryVariables
    >({
      query: GetMarketDocument,
      variables: {
        market: marketAddressFormatted,
        ...filters,
      },
    })

    return Market.fromSubgraphMarketData(
      TargetChainId,
      signerOrProvider,
      result.data.market!,
    )
  }

  async function updateMarket(market: Market | undefined) {
    if (!market || !marketAddress || !signerOrProvider) throw Error()

    const lens = getLensContract(TargetChainId, signerOrProvider)
    const update = await lens.getMarketData(marketAddress)
    market.updateWith(update)

    return market
  }

  async function queryFn() {
    const marketFromSubgraph = await queryMarket()
    return updateMarket(marketFromSubgraph)
  }

  return useQuery({
    queryKey: [GET_MARKET_KEY, marketAddress],
    queryFn,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!marketAddress || !signerOrProvider || isWrongNetwork,
    refetchOnMount: false,
  })
}
