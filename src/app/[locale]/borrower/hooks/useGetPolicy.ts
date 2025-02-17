import { useQuery } from "@tanstack/react-query"
import {
  assert,
  getPolicyMarketsAndLenders,
  SignerOrProvider,
  SubgraphGetMarketsAndLendersByHooksInstanceOrControllerQueryVariables,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { updateMarkets } from "./getMaketsHooks/updateMarkets"

export const GET_POLICY_KEY = "GET_POLICY"

export type GetPolicyArgs = Omit<
  SubgraphGetMarketsAndLendersByHooksInstanceOrControllerQueryVariables,
  "contractAddress"
> & {
  policy?: string
}

export const useGetPolicy = ({ policy, ...variables }: GetPolicyArgs) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()
  const { address } = useAccount()

  const signerOrProvider = signer ?? provider

  async function getPolicy() {
    assert(policy !== undefined, `Policy undefined ${policy}`)
    const { markets, lenders, hooksInstance, controller } =
      await getPolicyMarketsAndLenders(SubgraphClient, {
        fetchPolicy: "network-only",
        contractAddress: policy?.toLowerCase(),
        chainId: chainId as SupportedChainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
        ...variables,
      })

    await updateMarkets(markets, provider)
    return { markets, lenders, hooksInstance, controller }
  }

  return useQuery({
    queryKey: [GET_POLICY_KEY, chainId, policy],
    queryFn: getPolicy,
    refetchInterval: POLLING_INTERVAL,
    enabled: address && !!policy && !isWrongNetwork && !!signerOrProvider,
    refetchOnMount: false,
  })
}
