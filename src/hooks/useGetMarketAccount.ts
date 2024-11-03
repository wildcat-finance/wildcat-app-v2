import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  getLenderAccountForMarket,
  getLensContract,
  getLensV2Contract,
  MarketVersion,
  Market,
  MarketAccount,
} from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"
import { SubgraphClient } from "@/config/subgraph"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY =
  "get-borrower-market-account-legacy"

export const GET_MARKET_ACCOUNT_KEY = "get-market-account"

export const useGetMarketAccountForBorrowerLegacy = (
  market: Market | undefined,
) => {
  const { provider, signer, isWrongNetwork, address } = useEthersProvider()
  const signerOrProvider = signer ?? provider

  async function getMarketAccountFn() {
    return getLenderAccountForMarket(SubgraphClient, {
      market: market as Market,
      lender: address as string,
      fetchPolicy: "network-only",
    })
  }

  async function updateMarket(marketAccount: MarketAccount) {
    if (!marketAccount || !address || !signerOrProvider) throw Error()
    if (marketAccount.market.version === MarketVersion.V1) {
      const lens = getLensContract(TargetChainId, signerOrProvider)
      const update = await lens.getMarketDataWithLenderStatus(
        address,
        marketAccount.market.address,
      )
      marketAccount.market.updateWith(update.market)
      marketAccount.updateWith(update.lenderStatus)
    } else {
      const lens = getLensV2Contract(TargetChainId, signerOrProvider)
      const update = await lens.getMarketDataWithLenderStatus(
        address,
        marketAccount.market.address,
      )
      marketAccount.market.updateWith(update.market)
      marketAccount.updateWith(update.lenderStatus)
    }

    return marketAccount
  }

  async function queryFn() {
    const marketFromSubgraph = await getMarketAccountFn()
    return updateMarket(marketFromSubgraph)
  }

  return useQuery({
    queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY, address, market],
    queryFn,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })
}
