import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  SubgraphGetMarketsWithEventsQueryVariables,
  // eslint-disable-next-line camelcase
  SubgraphMarket_Filter,
  SupportedChainId,
  getMarketsForBorrower,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
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
  marketFilter,
  shouldSkipRecords = true,
  ...variables
}: GetMarketsProps) {
  const { address } = useAccount()

  async function queryBorrowerMarkets() {
    console.log(`Running getMarketsForBorrower!`)
    if (!address) return []
    // eslint-disable-next-line camelcase
    const filter: SubgraphMarket_Filter = { ...marketFilter }
    if (address) {
      filter.borrower = address.toLowerCase()
    }

    return getMarketsForBorrower(SubgraphClient, {
      borrower: address as string,
      chainId: chainId as SupportedChainId,
      signerOrProvider: provider as SignerOrProvider,
      fetchPolicy: "network-only",
      marketFilter: filter,
      ...variables,
      shouldSkipRecords,
    })
  }

  async function getBorrowerMarkets() {
    const subgraphMarkets = await queryBorrowerMarkets()
    return updateMarkets(subgraphMarkets, provider)
  }

  return useQuery({
    queryKey: [
      GET_BORROWER_MARKETS,
      address,
      chainId,
      JSON.stringify(marketFilter),
      shouldSkipRecords,
      variables,
    ],
    queryFn: getBorrowerMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetBorrowerMarkets = (
  args?: SubgraphGetMarketsWithEventsQueryVariables | undefined,
) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider

  return useGetBorrowerMarketsQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
    ...args,
  })
}
