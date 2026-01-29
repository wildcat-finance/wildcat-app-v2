/* eslint-disable camelcase */
import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  SubgraphGetMarketsWithEventsQueryVariables,
  SubgraphMarket_Filter,
  SupportedChainId,
  getMarketsForBorrower,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { EXCLUDED_MARKETS_FILTER } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"

import { GetMarketsProps } from "./interface"

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
  const { chainId: selectedChainId } = useSelectedNetwork()
  const targetChainId = chainId ?? selectedChainId
  const subgraphClient = getSubgraphClient(targetChainId)
  const network = useSelectedNetwork()
  const address = (borrowerAddress ?? userAddress)?.toLowerCase()

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

    return getMarketsForBorrower(subgraphClient, {
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
      return updateMarkets(subgraphMarkets, provider, network)
    } catch (error) {
      console.log("Error fetching borrower markets", error)
      throw error
    }
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(
      network.chainId,
      address,
      JSON.stringify(marketFilter),
      shouldSkipRecords ?? true,
      variables,
    ),
    queryFn: getBorrowerMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetBorrowerMarkets = (
  borrowerAddress?: `0x${string}`,
  externalChainId?: number,
  args?: SubgraphGetMarketsWithEventsQueryVariables | undefined,
) => {
  const { chainId: currentChainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider
  const chainId = externalChainId ?? currentChainId

  return useGetBorrowerMarketsQuery({
    borrowerAddress,
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
    ...args,
  })
}
