import assert from "assert"

import { useQuery } from "@tanstack/react-query"
import {
  BasicLenderData,
  getActiveLendersByMarket,
  getLensV2Contract,
  getPolicyMarketsAndLenders,
  Market,
  MarketVersion,
  SignerOrProvider,
  SupportedChainId,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useAccount } from "wagmi"

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"

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
    const policy =
      market.version === MarketVersion.V2
        ? market.hooksConfig?.hooksAddress
        : market.controller
    assert(policy !== undefined, `Policy undefined ${policy}`)
    const [{ lenders: policyLenders }, activeLenders] = await Promise.all([
      getPolicyMarketsAndLenders(subgraphClient, {
        fetchPolicy: "network-only",
        contractAddress: policy?.toLowerCase(),
        chainId: targetChainId as SupportedChainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
        numMarkets: 1,
      }),
      getActiveLendersByMarket(subgraphClient, {
        fetchPolicy: "network-only",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        market: market as any,
      }),
    ])

    const inactiveLenders = policyLenders.filter(
      (x) =>
        !activeLenders.some(
          (y) => y.address.toLowerCase() === x.address.toLowerCase(),
        ),
    )

    const allLenders = [
      ...activeLenders,
      ...inactiveLenders.map(
        (lender) =>
          new BasicLenderData({
            market,
            address: lender.address,
            scaledBalance: BigNumber.from(0),
            addedTimestamp: lender.addedTimestamp,
            credential: lender.credential,
            isAuthorizedOnController: lender.isAuthorizedOnController,
            isKnownLender: lender.activeMarkets.find(
              (y) => y.address.toLowerCase() === market.address.toLowerCase(),
            )?.isKnownLender,
          }),
      ),
    ]
    if (market.version === MarketVersion.V2) {
      const lens = getLensV2Contract(targetChainId, signerOrProvider)
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
    refetchInterval: POLLING_INTERVALS.default,
    enabled: address && market && !!targetChainId && !!subgraphClient,

    refetchOnMount: false,
  })
}
