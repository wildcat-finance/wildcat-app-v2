import {
  Market,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

type MarketWithBatchV2 = typeof Market & {
  getMarketsV2?: (
    chainId: SupportedChainId,
    markets: string[],
    provider: SignerOrProvider,
  ) => Promise<Market[]>
}

export const getMarketsV2Safe = async (
  chainId: SupportedChainId,
  markets: string[],
  provider: SignerOrProvider,
): Promise<Market[]> => {
  const batchGetter = (Market as MarketWithBatchV2).getMarketsV2
  if (batchGetter) {
    return batchGetter.call(Market, chainId, markets, provider)
  }

  return Promise.all(
    markets.map((market) => Market.getMarketV2(chainId, market, provider)),
  )
}
