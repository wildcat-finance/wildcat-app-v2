import { useQuery } from "@tanstack/react-query"
import {
  getIndexedMarketList,
  getSubgraphClient,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { NETWORKS_BY_ID } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { isNotExcludedMarket } from "@/utils/filters"

import { GetMarketsProps } from "./interface"

export function useGetBorrowerMarketsQuery({
  borrowerAddress,
  provider,
  enabled,
  chainId,
}: GetMarketsProps) {
  const { address: userAddress } = useAccount()
  const address = (borrowerAddress ?? userAddress)?.toLowerCase()

  async function queryBorrowerMarkets() {
    if (!address || !chainId || !provider) return []
    const subgraphClient = getSubgraphClient(chainId)
    const markets = await getIndexedMarketList(subgraphClient, {
      chainId,
      signerOrProvider: provider,
      fetchPolicy: "network-only",
      filter: {
        borrower: address,
        excludeAddresses: EXCLUDED_MARKETS,
      },
    })
    return markets.filter(isNotExcludedMarket)
  }

  async function getBorrowerMarkets() {
    const subgraphMarkets = await queryBorrowerMarkets()
    if (!chainId) return []
    return updateMarkets(subgraphMarkets, provider, NETWORKS_BY_ID[chainId])
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(chainId ?? 0, address),
    queryFn: getBorrowerMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetBorrowerMarkets = (
  borrowerAddress?: `0x${string}`,
  externalChainId?: SupportedChainId,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const { provider, signer } = useEthersProvider({ chainId })

  const signerOrProvider = signer ?? provider

  return useGetBorrowerMarketsQuery({
    borrowerAddress,
    provider: signerOrProvider,
    enabled: !!chainId && !!signerOrProvider,
    chainId,
  })
}
