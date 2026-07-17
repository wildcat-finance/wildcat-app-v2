import { useQuery } from "@tanstack/react-query"
import {
  assert,
  getPolicyMarketsAndLenders,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

import { updateMarkets } from "./getMaketsHooks/updateMarkets"

export type GetPolicyArgs = {
  policy?: string
}

export const useGetPolicy = ({ policy }: GetPolicyArgs) => {
  const network = useSelectedNetwork()
  const { chainId } = network
  const { isWrongNetwork, provider, signer } = useEthersProvider()
  const { address } = useAccount()

  const signerOrProvider = signer ?? provider
  const subgraphClient = useSubgraphClient()

  async function getPolicy() {
    assert(policy !== undefined, `Policy undefined ${policy}`)
    const {
      markets: indexedMarkets,
      lenders,
      hooksInstance,
      controller,
    } = await getPolicyMarketsAndLenders(subgraphClient, {
      fetchPolicy: "network-only",
      contractAddress: policy?.toLowerCase(),
      chainId: chainId as SupportedChainId,
      signerOrProvider: signerOrProvider as SignerOrProvider,
    })

    const markets = [...indexedMarkets].sort(
      (a, b) => Number(a.isClosed) - Number(b.isClosed),
    )
    await updateMarkets(markets, provider, network)
    return { markets, lenders, hooksInstance, controller }
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_POLICY(chainId, policy),
    queryFn: getPolicy,
    refetchInterval: POLLING_INTERVAL,
    enabled: address && !!policy && !isWrongNetwork && !!signerOrProvider,
    refetchOnMount: false,
  })
}
