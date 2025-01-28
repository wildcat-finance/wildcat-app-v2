import assert from "assert"

import { useQuery } from "@tanstack/react-query"
import {
  BasicLenderData,
  getActiveLendersByMarket,
  getLensV2Contract,
  getPolicyMarketsAndLenders,
  LenderRole,
  Market,
  MarketVersion,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { useAccount } from "wagmi"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_MARKET_LENDERS_KEY = `GET_MARKET_LENDERS_KEY`

export const useGetMarketLenders = (market?: Market) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, signer, provider } = useEthersProvider()
  const { address } = useAccount()
  const signerOrProvider = signer ?? provider

  async function getMarketLenders() {
    if (!market) throw new Error("Market undefined")
    if (!signerOrProvider) throw new Error("Signer or provider undefined")
    const policy =
      market.version === MarketVersion.V2
        ? market.hooksConfig?.hooksAddress
        : market.controller
    assert(policy !== undefined, `Policy undefined ${policy}`)
    const [{ lenders: policyLenders }, activeLenders] = await Promise.all([
      getPolicyMarketsAndLenders(SubgraphClient, {
        fetchPolicy: "network-only",
        contractAddress: policy?.toLowerCase(),
        chainId: chainId as SupportedChainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
        numMarkets: 1,
      }),
      getActiveLendersByMarket(SubgraphClient, {
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
      const lens = getLensV2Contract(TargetChainId, signerOrProvider)
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
    queryKey: [GET_MARKET_LENDERS_KEY, chainId, market?.address],
    queryFn: getMarketLenders,
    refetchInterval: POLLING_INTERVAL,
    enabled: address && market && !isWrongNetwork,
    refetchOnMount: false,
  })
}
