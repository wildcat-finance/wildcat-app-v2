/* eslint-disable camelcase */
import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  SubgraphGetMarketsWithEventsQueryVariables,
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
import { EXCLUDED_MARKETS_FILTER } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"

import { GetMarketsProps } from "./interface"

export const GET_BORROWER_MARKETS = "get-borrower-markets"

export function useGetBorrowerMarketsQuery({
  borrowerAddress,
  provider,
  enabled,
  chainId,
  marketFilter,
  shouldSkipRecords = true,
  ...variables
}: GetMarketsProps) {
  const { address: userAddress } = useAccount()

  const address = borrowerAddress ?? userAddress

  async function queryBorrowerMarkets() {
    console.log(`Running getMarketsForBorrower!`)
    if (!address) return []
    // eslint-disable-next-line camelcase
    const filter = (combineFilters([
      {
        ...marketFilter,
      },
      ...EXCLUDED_MARKETS_FILTER,
      ...(address ? [{ borrower: address.toLowerCase() }] : []),
    ]) ?? {}) as SubgraphMarket_Filter

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
    try {
      const subgraphMarkets = await queryBorrowerMarkets()
      return updateMarkets(subgraphMarkets, provider)
    } catch (error) {
      console.log("Error fetching borrower markets", error)
      throw error
    }
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
  borrowerAddress?: `0x${string}`,
  args?: SubgraphGetMarketsWithEventsQueryVariables | undefined,
) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider

  return useGetBorrowerMarketsQuery({
    borrowerAddress,
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
    ...args,
  })
}
