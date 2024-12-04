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

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

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
    const borrower = address as string
    const lens = getLensV2Contract(chain, signerOrProvider)
    const [{ isRegisteredBorrower, ...result }, controller] = await Promise.all(
      [
        lens.getHooksDataForBorrower(borrower),
        getController(chain, signerOrProvider, borrower),
      ],
    )
    console.log("result", result)
    const hooksTemplates = result.hooksTemplates.map((t) =>
      hooksTemplateFromLens(
        chain,
        signerOrProvider,
        t,
        borrower,
        isRegisteredBorrower,
      ),
    )
    console.log(
      "hooksTemplatess",
      result.hooksInstances.map((i) => i.kind),
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
      console.log(`Error getting hooks instances: ${err}`)
      throw err
    }

    return {
      hooksInstances,
      hooksTemplates,
      isRegisteredBorrower,
      controller: controller.isDeployed ? controller : undefined,
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
  async function getBorrowerHooksData() {
    const result = await getAllHooksDataForBorrower(SubgraphClient, {
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
