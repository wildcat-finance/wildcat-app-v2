import { useQuery } from "@tanstack/react-query"
import {
  getBorrowerHooksData,
  MarketController,
  SignerOrProvider,
  SupportedChainId,
  BorrowerHooksDataResult,
  getController,
  getAllHooksDataForBorrower,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { NETWORKS_BY_ID } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const GET_BORROWER_HOOKS_DATA = "get-borrower-hooks-data"
export const GET_BORROWER_HOOKS_DATA_WITH_SUBGRAPH =
  "get-borrower-hooks-data-with-subgraph"
export type GetBorrowerHooksDataProps = {
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
}

type BorrowerHooksDataQueryResult = BorrowerHooksDataResult & {
  controller?: MarketController
}

export function useGetBorrowerHooksDataQuery({
  provider,
  enabled,
  chainId,
}: GetBorrowerHooksDataProps) {
  const { address } = useAccount()

  async function getBorrowerHooksDataQueryFn(): Promise<BorrowerHooksDataQueryResult> {
    const chain = chainId! as SupportedChainId
    const signerOrProvider = provider! as SignerOrProvider
    const supportsV1 =
      NETWORKS_BY_ID[chainId as SupportedChainId].hasV1Deployment
    const borrower = address as string
    const [result, controller] = await Promise.all([
      getBorrowerHooksData(chain, signerOrProvider, borrower),
      supportsV1 ? getController(chain, signerOrProvider, borrower) : undefined,
    ])

    return {
      hooksInstances: result.hooksInstances,
      hooksTemplates: result.hooksTemplates,
      isRegisteredBorrower: result.isRegisteredBorrower,
      controller: controller?.isDeployed ? controller : undefined,
    }
  }

  return useQuery({
    queryKey: [GET_BORROWER_HOOKS_DATA, address, chainId],
    queryFn: getBorrowerHooksDataQueryFn,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useGetBorrowerHooksData = () => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider

  return useGetBorrowerHooksDataQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
  })
}

export function useGetBorrowerHooksDataWithSubgraphQuery({
  provider,
  enabled,
  chainId,
}: GetBorrowerHooksDataProps) {
  const { address } = useAccount()
  const subgraphClient = useSubgraphClient()
  async function getBorrowerHooksDataWithSubgraph() {
    const result = await getAllHooksDataForBorrower(subgraphClient, {
      borrower: address as string,
      chainId: chainId as SupportedChainId,
      fetchPolicy: "network-only",
      signerOrProvider: provider as SignerOrProvider,
    })
    return result
  }

  return useQuery({
    queryKey: [GET_BORROWER_HOOKS_DATA_WITH_SUBGRAPH, address, chainId],
    queryFn: getBorrowerHooksDataWithSubgraph,
    enabled: !!address && !!chainId && enabled,
    refetchInterval: POLLING_INTERVAL,
    refetchOnMount: false,
  })
}

export const useGetBorrowerHooksDataWithSubgraph = () => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()
  const signerOrProvider = signer ?? provider

  return useGetBorrowerHooksDataWithSubgraphQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
  })
}
