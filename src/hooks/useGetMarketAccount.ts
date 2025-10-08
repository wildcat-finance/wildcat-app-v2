import { useEffect } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  getLenderAccountForMarket,
  getLensContract,
  getLensV2Contract,
  MarketVersion,
  Market,
  MarketAccount,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const useGetMarketAccountForBorrowerLegacy = (
  market: Market | undefined,
) => {
  const subgraphClient = useSubgraphClient()
  const { provider, signer, isWrongNetwork, address, chainId, targetChainId } =
    useEthersProvider()
  const signerOrProvider = signer ?? provider

  async function getMarketAccountFn() {
    return getLenderAccountForMarket(subgraphClient, {
      market: market as Market,
      lender: address as string,
      fetchPolicy: "network-only",
    })
  }

  async function updateMarket(marketAccount: MarketAccount) {
    if (
      !marketAccount ||
      !address ||
      !signerOrProvider ||
      !chainId ||
      !targetChainId
    ) {
      console.log("updateMarket: missing required parameters")
      throw Error()
    }
    if (chainId !== marketAccount.market.chainId || chainId !== targetChainId) {
      throw Error(
        `Signer chainId does not match market or target chainId:` +
          ` Market ${marketAccount.market.chainId},` +
          ` Target ${targetChainId},` +
          ` Signer ${chainId}`,
      )
    }

    if (marketAccount.market.version === MarketVersion.V1) {
      const lens = getLensContract(chainId, signerOrProvider)
      const update = await lens.getMarketDataWithLenderStatus(
        address,
        marketAccount.market.address,
      )
      marketAccount.market.updateWith(update.market)
      marketAccount.updateWith(update.lenderStatus)
    } else {
      const lens = getLensV2Contract(chainId, signerOrProvider)
      const update = await lens.getMarketDataWithLenderStatus(
        address,
        marketAccount.market.address,
      )
      marketAccount.market.updateWith(update.market)
      marketAccount.updateWith(update.lenderStatus)
    }

    if (market && market.provider !== signerOrProvider) {
      market.provider = signerOrProvider
    }

    return marketAccount
  }

  async function queryFn() {
    const marketFromSubgraph = await getMarketAccountFn()
    return updateMarket(marketFromSubgraph)
  }

  // @todo is this needed?
  useEffect(() => {
    if (
      market &&
      signerOrProvider &&
      market.provider &&
      market.provider !== signerOrProvider
    ) {
      market.provider = signerOrProvider
    }
  }, [signerOrProvider])

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
      targetChainId,
      address,
      market?.address,
      market,
    ),
    queryFn,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })
}
