/* eslint-disable camelcase */
import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  SubgraphGetMarketsWithEventsQueryVariables,
  getMarketsWithEvents,
  SupportedChainId,
  SubgraphMarket_Filter,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { EXCLUDED_MARKETS_FILTER } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"

import { GetMarketsProps } from "./interface"

export function useGetOthersMarketsQuery({
  provider,
  enabled,
  chainId,
  marketFilter,
  shouldSkipRecords = true,
  ...variables
}: GetMarketsProps) {
  const { address } = useAccount()
  const subgraphClient = useSubgraphClient()
  const network = useSelectedNetwork()

  async function queryAllMarkets() {
    const filter = combineFilters([
      marketFilter,
      address ? { borrower_not: address.toLowerCase() } : {},
      ...EXCLUDED_MARKETS_FILTER,
    ]) as SubgraphMarket_Filter
    const result = await getMarketsWithEvents(subgraphClient, {
      chainId: chainId as SupportedChainId,
      fetchPolicy: "network-only",
      signerOrProvider: provider as SignerOrProvider,
      marketFilter: filter,
      ...variables,
      shouldSkipRecords,
    })
    return result
  }

  async function getAllMarkets() {
    const subgraphMarkets = await queryAllMarkets()
    return updateMarkets(subgraphMarkets, provider, network)
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(
      network.chainId,
      JSON.stringify(marketFilter),
      shouldSkipRecords ?? true,
      variables,
    ),
    queryFn: getAllMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetOthersMarkets = (
  args?: Omit<SubgraphGetMarketsWithEventsQueryVariables, "skip"> | undefined,
) => {
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
    ...args,
  })
}
