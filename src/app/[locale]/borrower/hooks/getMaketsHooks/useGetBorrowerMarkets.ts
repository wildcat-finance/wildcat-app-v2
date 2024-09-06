import { useQuery } from "@tanstack/react-query"
import { Market, SignerOrProvider } from "@wildcatfi/wildcat-sdk"
import {
  GetMarketsForBorrowerDocument,
  SubgraphGetMarketsForBorrowerQuery,
  SubgraphGetMarketsForBorrowerQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { GetMarketsProps } from "./interface"

export const GET_BORROWER_MARKETS = "get-borrower-markets"

export function useGetBorrowerMarketsQuery({
  provider,
  enabled,
  chainId,
  ...filters
}: GetMarketsProps) {
  const { address } = useAccount()

  async function queryBorrowerMarkets() {
    const result = await SubgraphClient.query<
      SubgraphGetMarketsForBorrowerQuery,
      SubgraphGetMarketsForBorrowerQueryVariables
    >({
      query: GetMarketsForBorrowerDocument,
      variables: { borrower: address as string, ...filters },
      fetchPolicy: "network-only",
    })

    const controller = result.data.controllers[0]
    if (controller) {
      return (
        controller.markets.map((market) =>
          Market.fromSubgraphMarketData(
            TargetChainId,
            provider as SignerOrProvider,
            market,
          ),
        ) ?? []
      )
    }

    return []
  }

  async function getBorrowerMarkets() {
    const subgraphMarkets = await queryBorrowerMarkets()
    return updateMarkets(subgraphMarkets, provider)
  }

  return useQuery({
    queryKey: [GET_BORROWER_MARKETS, address, chainId],
    queryFn: getBorrowerMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetBorrowerMarkets = () => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()
  const { isReconnecting } = useAccount()

  const signerOrProvider = signer ?? provider

  return useGetBorrowerMarketsQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork && !isReconnecting,
    chainId,
  })
}
