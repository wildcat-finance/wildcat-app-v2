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

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export type UseMarketProps = {
  address: string | undefined
} & Partial<Omit<SubgraphGetMarketQueryVariables, "market">>

export function useGetMarket({ address, ...filters }: UseMarketProps) {
  const subgraphClient = useSubgraphClient()
  const { signer, provider, isWrongNetwork, chainId } = useEthersProvider()
  const marketAddressFormatted = address?.toLowerCase()
  // since we still need to have an address and have the correct network, it means we need to have a connected wallet, so we only need a signer
  const signerOrProvider = signer || provider

  async function queryMarket() {
    if (!marketAddressFormatted || !signerOrProvider || !chainId) throw Error()

    const result = await subgraphClient.query<
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
      chainId,
      signerOrProvider,
      result.data.market!,
    )
  }

  async function updateMarket(market: Market | undefined) {
    if (!market || !signerOrProvider || !chainId) throw Error()
    if (market.version === MarketVersion.V1) {
      const lens = getLensContract(chainId, signerOrProvider)
      const update = await lens.getMarketData(market.address)
      market.updateWith(update)
    } else {
      const lens = getLensV2Contract(chainId, signerOrProvider)
      const update = await lens.getMarketData(market.address)
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
    queryKey: QueryKeys.Markets.GET_MARKET(
      chainId ?? 0,
      marketAddressFormatted,
    ),
    queryFn,
    refetchInterval: POLLING_INTERVALS.default,
    enabled:
      !!marketAddressFormatted &&
      !!signerOrProvider &&
      !!chainId &&
      !isWrongNetwork,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (data && signerOrProvider && data.provider !== signerOrProvider) {
      data.provider = signerOrProvider
    }
  }, [signerOrProvider])

  return { ...result, data }
}
