import { useEffect } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketVersion,
  getLensContract,
  getLensV2Contract,
} from "@wildcatfi/wildcat-sdk"
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
    if (market.version === MarketVersion.V1) {
      const lens = getLensContract(TargetChainId, signerOrProvider)
      const update = await lens.getMarketData(address)
      market.updateWith(update)
    } else {
      const lens = getLensV2Contract(TargetChainId, signerOrProvider)
      const update = await lens.getMarketData(address)
      market.updateWith(update)
    }
    if (market.provider !== signerOrProvider) {
      market.provider = signerOrProvider
    }

    return market
  }

  async function queryFn() {
    const marketFromSubgraph = await queryMarket()
    return updateMarket(marketFromSubgraph)
  }

  const { data, ...result } = useQuery({
    queryKey: [GET_MARKET_KEY, address],
    queryFn,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!address || !signerOrProvider || isWrongNetwork,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (data && signerOrProvider && data.provider !== signerOrProvider) {
      data.provider = signerOrProvider
    }
  }, [signerOrProvider])

  return { ...result, data }
}
