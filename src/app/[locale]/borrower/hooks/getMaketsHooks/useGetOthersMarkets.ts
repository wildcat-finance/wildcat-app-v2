import { useQuery } from "@tanstack/react-query"
import { Market, SignerOrProvider } from "@wildcatfi/wildcat-sdk"
import {
  GetMarketsForAllBorrowersDocument,
  SubgraphGetMarketsForAllBorrowersQuery,
  SubgraphGetMarketsForAllBorrowersQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { GetMarketsProps } from "./interface"

export const GET_ALL_MARKETS = "get-all-markets"

export function useGetOthersMarketsQuery({
  provider,
  enabled,
  chainId,
  ...filters
}: GetMarketsProps) {
  const { address } = useAccount()

  async function queryAllMarkets() {
    const result = await SubgraphClient.query<
      SubgraphGetMarketsForAllBorrowersQuery,
      SubgraphGetMarketsForAllBorrowersQueryVariables
    >({
      query: GetMarketsForAllBorrowersDocument,
      variables: { ...filters },
      fetchPolicy: "network-only",
    })

    return result.data.markets
      .filter((m) => !!m.controller)
      .map((market) =>
        Market.fromSubgraphMarketData(
          TargetChainId,
          provider as SignerOrProvider,
          market,
          address,
        ),
      )
  }

  async function getAllMarkets() {
    const subgraphMarkets = await queryAllMarkets()
    return updateMarkets(subgraphMarkets, provider)
  }

  return useQuery({
    queryKey: [GET_ALL_MARKETS, chainId],
    queryFn: getAllMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetOthersMarkets = () => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider
  console.log(
    `logging from useMarketsForBorrower.ts: have provider: ${!!provider} | isWrongNetwork: ${isWrongNetwork}`,
  )

  return useGetOthersMarketsQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
  })
}
