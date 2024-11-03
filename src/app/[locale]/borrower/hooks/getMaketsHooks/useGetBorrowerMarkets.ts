import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
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
  ...filters
}: GetMarketsProps) {
  const { address } = useAccount()

  async function queryBorrowerMarkets() {
    return getMarketsForBorrower(SubgraphClient, {
      borrower: address as string,
      chainId: chainId as SupportedChainId,
      signerOrProvider: provider as SignerOrProvider,
      fetchPolicy: "network-only",
      ...filters,
    })
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

  const signerOrProvider = signer ?? provider

  return useGetBorrowerMarketsQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
  })
}
