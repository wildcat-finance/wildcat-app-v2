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
  address: string | undefined
} & Partial<Omit<SubgraphGetMarketQueryVariables, "market">>

export function useGetMarket({ address, ...filters }: UseMarketProps) {
  const { signer, isWrongNetwork } = useEthersProvider()
  const marketAddressFormatted = address?.toLowerCase()
  // since we still need to have an address and have the correct network, it means we need to have a connected wallet, so we only need a signer
  const signerOrProvider = signer

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
    if (!market || !address || !signerOrProvider) throw Error()

    const lens = getLensContract(TargetChainId, signerOrProvider)
    const update = await lens.getMarketData(address)
    market.updateWith(update)

    return market
  }

  async function queryFn() {
    const marketFromSubgraph = await queryMarket()
    return updateMarket(marketFromSubgraph)
  }

  return useQuery({
    queryKey: [GET_MARKET_KEY, address],
    queryFn,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!address || !signerOrProvider || isWrongNetwork,
    refetchOnMount: false,
  })
}
