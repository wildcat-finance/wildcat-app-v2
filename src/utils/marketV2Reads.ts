import {
  Market,
  MarketAccount,
  SignerOrProvider,
  SupportedChainId,
  getLatestLensContract,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

type LenderStatusUpdate = Parameters<MarketAccount["updateWith"]>[0]

function zeroLenderBalances(lenderStatus: LenderStatusUpdate) {
  const zero = BigInt(0)
  return {
    ...lenderStatus,
    normalizedBalance: zero,
    scaledBalance: zero,
    underlyingBalance: zero,
    underlyingApproval: zero,
  } as unknown as LenderStatusUpdate
}

type MarketWithBatchV2 = typeof Market & {
  getMarketsV2?: (
    chainId: SupportedChainId,
    markets: string[],
    provider: SignerOrProvider,
  ) => Promise<Market[]>
  refreshMarketsV2LiveData?: (
    chainId: SupportedChainId,
    markets: Market[],
    provider: SignerOrProvider,
  ) => Promise<Market[]>
}

type MarketAccountWithBatchV2 = typeof MarketAccount & {
  refreshMarketAccountsV2LiveData?: (
    chainId: SupportedChainId,
    provider: SignerOrProvider,
    account: string | undefined,
    marketAccounts: MarketAccount[],
  ) => Promise<MarketAccount[]>
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

export const refreshMarketAccountsV2LiveDataSafe = async (
  chainId: SupportedChainId,
  provider: SignerOrProvider,
  account: string | undefined,
  marketAccounts: MarketAccount[],
): Promise<MarketAccount[]> => {
  const refreshGetter = (MarketAccount as MarketAccountWithBatchV2)
    .refreshMarketAccountsV2LiveData
  if (refreshGetter) {
    return refreshGetter.call(
      MarketAccount,
      chainId,
      provider,
      account,
      marketAccounts,
    )
  }

  const marketAddresses = marketAccounts.map(
    (marketAccount) => marketAccount.market.address,
  )
  const latestLens = getLatestLensContract(chainId, provider)
  const [updates, refreshedMarkets] = await Promise.all([
    latestLens.getMarketsDataWithLenderStatus(
      account ?? zeroAddress,
      marketAddresses,
    ),
    getMarketsV2Safe(chainId, marketAddresses, provider),
  ])
  marketAccounts.forEach((marketAccount, i) => {
    const update = updates[i]
    marketAccount.market.updateWith(update.market)
    Object.assign(marketAccount.market, refreshedMarkets[i])
    marketAccount.updateWith(
      !account ? zeroLenderBalances(update.lenderStatus) : update.lenderStatus,
    )
  })
  return marketAccounts
}

export const refreshMarketsV2LiveDataSafe = async (
  chainId: SupportedChainId,
  markets: Market[],
  provider: SignerOrProvider,
): Promise<Market[]> => {
  const refreshGetter = (Market as MarketWithBatchV2).refreshMarketsV2LiveData
  if (refreshGetter) {
    return refreshGetter.call(Market, chainId, markets, provider)
  }

  const refreshedMarkets = await getMarketsV2Safe(
    chainId,
    markets.map((market) => market.address),
    provider,
  )
  refreshedMarkets.forEach((market, i) => {
    Object.assign(markets[i], market)
  })
  return markets
}
