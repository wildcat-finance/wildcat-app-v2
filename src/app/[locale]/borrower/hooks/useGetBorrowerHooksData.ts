import { useQuery } from "@tanstack/react-query"
import {
  getLensV2Contract,
  SignerOrProvider,
  SupportedChainId,
  GetAllHooksDataForBorrowerResult,
} from "@wildcatfi/wildcat-sdk"
import {
  HooksInstance,
  hooksInstanceFromLens,
  hooksTemplateFromLens,
} from "@wildcatfi/wildcat-sdk/dist/access"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_BORROWER_HOOKS_DATA = "get-borrower-hooks-data"
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
    const { isRegisteredBorrower, ...result } =
      await lens.getHooksDataForBorrower(borrower)
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
