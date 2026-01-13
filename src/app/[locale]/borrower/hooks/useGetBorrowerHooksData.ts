import { useQuery } from "@tanstack/react-query"
import {
  getLensV2Contract,
  SignerOrProvider,
  SupportedChainId,
  GetAllHooksDataForBorrowerResult,
  getController,
  getAllHooksDataForBorrower,
} from "@wildcatfi/wildcat-sdk"
import {
  HooksInstance,
  hooksInstanceFromLens,
  hooksTemplateFromLens,
} from "@wildcatfi/wildcat-sdk/dist/access"
import { useAccount } from "wagmi"

import { NETWORKS_BY_ID } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const GET_BORROWER_HOOKS_DATA = "get-borrower-hooks-data"
export const GET_BORROWER_HOOKS_DATA_WITH_SUBGRAPH =
  "get-borrower-hooks-data-with-subgraph"
export type GetBorrowerHooksDataProps = {
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
}

export function useGetBorrowerHooksDataQuery({
  provider,
  enabled,
  chainId,
}: GetBorrowerHooksDataProps) {
  const { address } = useAccount()

  async function getBorrowerHooksData(): Promise<GetAllHooksDataForBorrowerResult> {
    const chain = chainId! as SupportedChainId
    const signerOrProvider = provider! as SignerOrProvider
    const supportsV1 =
      NETWORKS_BY_ID[chainId as SupportedChainId].hasV1Deployment
    const borrower = address as string
    const lens = getLensV2Contract(chain, signerOrProvider)
    const [{ isRegisteredBorrower, ...result }, controller] = await Promise.all(
      [
        lens.getHooksDataForBorrower(borrower),
        supportsV1
          ? getController(chain, signerOrProvider, borrower)
          : undefined,
      ],
    )
    logger.debug(
      {
        chainId: chain,
        borrower,
        hooksInstancesCount: result.hooksInstances.length,
        hooksTemplatesCount: result.hooksTemplates.length,
      },
      "Fetched borrower hooks data",
    )
    const hooksTemplates = result.hooksTemplates.map((t) =>
      hooksTemplateFromLens(
        chain,
        signerOrProvider,
        t,
        borrower,
        isRegisteredBorrower,
      ),
    )
    logger.debug(
      { kinds: result.hooksInstances.map((i) => i.kind) },
      "Borrower hooks instance kinds",
    )
    let hooksInstances: HooksInstance[] = []
    try {
      hooksInstances = result.hooksInstances.map((i) =>
        hooksInstanceFromLens(
          chain,
          signerOrProvider,
          i,
          borrower,
          isRegisteredBorrower,
        ),
      )
    } catch (err) {
      logger.error(
        { err, chainId: chain, borrower },
        "Error getting hooks instances",
      )
      throw err
    }

    return {
      hooksInstances,
      hooksTemplates,
      isRegisteredBorrower,
      controller: controller?.isDeployed ? controller : undefined,
    }
  }

  return useQuery({
    queryKey: [GET_BORROWER_HOOKS_DATA, address, chainId],
    queryFn: getBorrowerHooksData,
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
  async function getBorrowerHooksData() {
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
    queryFn: getBorrowerHooksData,
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
