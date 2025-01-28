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
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { GetMarketsProps } from "./interface"

export const GET_ALL_MARKETS = "get-all-markets"

const combineFilters = (
  _filters: (SubgraphMarket_Filter | null | undefined)[],
) => {
  const filters = _filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  ) as SubgraphMarket_Filter[]
  if (filters.length === 0) return undefined
  if (filters.length === 1) return filters[0]
  return { and: filters }
}

export function useGetOthersMarketsQuery({
  provider,
  enabled,
  chainId,
  marketFilter,
  shouldSkipRecords = true,
  ...variables
}: GetMarketsProps) {
  const { address } = useAccount()

  async function queryAllMarkets() {
    const filter = combineFilters([
      marketFilter,
      address ? { borrower_not: address.toLowerCase() } : {},
    ])
    const result = await getMarketsWithEvents(SubgraphClient, {
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
    return updateMarkets(subgraphMarkets, provider)
  }

  return useQuery({
    queryKey: [
      GET_ALL_MARKETS,
      chainId,
      JSON.stringify(marketFilter),
      shouldSkipRecords,
      variables,
    ],
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
