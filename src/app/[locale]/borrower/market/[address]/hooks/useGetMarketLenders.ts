import assert from "assert"

import { useQuery } from "@tanstack/react-query"
import {
  BasicLenderData,
  getActiveLendersByMarket,
  getLatestLensContract,
  getPolicyMarketsAndLenders,
  Market,
  SignerOrProvider,
  SupportedChainId,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import {
  getMarketPolicyAddress,
  isHooksManagedMarket,
} from "@/utils/marketCapabilities"
import {
  mergePolicyLenderAccess,
  type PolicyLenderAccessSource,
} from "@/utils/policyLenderAccess"

export type MarketLenderData = BasicLenderData & {
  accessSources: PolicyLenderAccessSource[]
}

export const useGetMarketLenders = (market?: Market) => {
  const { signer, provider, chainId } = useEthersProvider({
    chainId: market?.chainId,
  })
  const targetChainId = market?.chainId ?? chainId
  const subgraphClient = targetChainId
    ? getSubgraphClient(targetChainId)
    : undefined
  const { address } = useAccount()
  const signerOrProvider = signer ?? provider

  async function getMarketLenders() {
    if (!market) throw new Error("Market undefined")
    if (!signerOrProvider) throw new Error("Signer or provider undefined")
    if (!targetChainId) throw new Error("Chain ID undefined") // Should never happen
    if (!subgraphClient) throw new Error("Subgraph client undefined")
    const policy = getMarketPolicyAddress(market)
    assert(policy !== undefined, `Policy undefined ${policy}`)
    const [policyData, activeLenders] = await Promise.all([
      getPolicyMarketsAndLenders(subgraphClient, {
        fetchPolicy: "network-only",
        contractAddress: policy?.toLowerCase(),
        chainId: targetChainId as SupportedChainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
      }),
      getActiveLendersByMarket(subgraphClient, {
        fetchPolicy: "network-only",
        market,
      }),
    ])

    const policyLenders = mergePolicyLenderAccess(
      policyData.lenders,
      policyData.accessListMembers,
    )
    const inactiveLenders = policyLenders.filter(
      (x) =>
        !activeLenders.some(
          (y) => y.address.toLowerCase() === x.address.toLowerCase(),
        ),
    )

    const allLenders: MarketLenderData[] = [
      ...activeLenders.map((lender) => {
        const policyLender = policyLenders.find(
          (candidate) =>
            candidate.address.toLowerCase() === lender.address.toLowerCase(),
        )
        return Object.assign(lender, {
          accessSources: policyLender?.sources ?? [],
        })
      }),
      ...inactiveLenders.map((access) =>
        Object.assign(
          new BasicLenderData({
            market,
            address: access.address,
            scaledBalance: BigInt(0),
            addedTimestamp: access.addedTimestamp,
            credential: access.lender?.credential,
            isAuthorizedOnController: access.lender?.isAuthorizedOnController,
            isKnownLender: access.lender?.activeMarkets.find(
              (y) => y.address.toLowerCase() === market.address.toLowerCase(),
            )?.isKnownLender,
          }),
          { accessSources: access.sources },
        ),
      ),
    ]
    if (isHooksManagedMarket(market)) {
      const lens = getLatestLensContract(targetChainId, signerOrProvider)
      const updates = await lens.getLenderAccountsData(
        market.address,
        allLenders.map((x) => x.address),
      )
      updates.forEach((update) => {
        const lender = allLenders.find(
          (x) => x.address.toLowerCase() === update.lender.toLowerCase(),
        )
        if (lender) {
          lender.updateWith(update)
        }
      })
    }
    return allLenders
  }

  return useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_LENDERS(
      targetChainId ?? 0,
      market?.address,
    ),
    queryFn: getMarketLenders,
    refetchInterval: POLLING_INTERVAL,
    enabled: address && market && !!targetChainId && !!subgraphClient,
    refetchOnMount: false,
  })
}
