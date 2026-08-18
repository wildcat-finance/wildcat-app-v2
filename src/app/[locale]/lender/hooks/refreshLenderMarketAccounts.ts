import {
  getLensContract,
  getLensV2Contract,
  hasDeploymentAddress,
  MarketAccount,
  MarketVersion,
  refreshLenderAccountState,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { TOKENS_ADDRESSES } from "@/utils/constants"

const MARKET_REFRESH_CHUNK_SIZE = 40
const MARKET_REFRESH_CONCURRENCY = 2

function getChunks(
  chainId: SupportedChainId,
  marketAccounts: MarketAccount[],
): { v1Chunks: MarketAccount[][]; v2Chunks: MarketAccount[][] } {
  const v1Accounts = marketAccounts.filter(
    ({ market }) => market.version === MarketVersion.V1,
  )
  const v2Accounts = marketAccounts.filter(
    ({ market }) => market.version === MarketVersion.V2,
  )
  const isWeth = ({ market }: MarketAccount): boolean =>
    market.underlyingToken.address.toLowerCase() === TOKENS_ADDRESSES.WETH

  if (chainId === SupportedChainId.Mainnet) {
    return {
      v1Chunks: [
        ...v1Accounts.filter(isWeth).map((account) => [account]),
        v1Accounts.filter((account) => !isWeth(account)),
      ],
      v2Chunks: [
        ...v2Accounts.filter(isWeth).map((account) => [account]),
        v2Accounts.filter((account) => !isWeth(account)),
      ],
    }
  }

  return {
    v1Chunks: [v1Accounts],
    v2Chunks: [v2Accounts],
  }
}

function splitMarketRefreshChunks(accountsChunks: MarketAccount[][]) {
  return accountsChunks.flatMap((accountsChunk) => {
    const chunks: MarketAccount[][] = []
    for (
      let start = 0;
      start < accountsChunk.length;
      start += MARKET_REFRESH_CHUNK_SIZE
    ) {
      chunks.push(accountsChunk.slice(start, start + MARKET_REFRESH_CHUNK_SIZE))
    }
    return chunks
  })
}

async function refreshChunks(
  accountsChunks: MarketAccount[][],
  refresh: (accountsChunk: MarketAccount[]) => Promise<void>,
) {
  let nextChunk = 0
  const refreshNextChunk = async (): Promise<void> => {
    const accountsChunk = accountsChunks[nextChunk]
    nextChunk += 1
    if (accountsChunk) {
      await refresh(accountsChunk)
      await refreshNextChunk()
    }
  }
  const workers = Array.from(
    {
      length: Math.min(MARKET_REFRESH_CONCURRENCY, accountsChunks.length),
    },
    refreshNextChunk,
  )
  await Promise.all(workers)
}

export async function refreshLenderMarketAccounts(
  chainId: SupportedChainId,
  provider: SignerOrProvider,
  lender: string | undefined,
  marketAccounts: MarketAccount[],
): Promise<MarketAccount[]> {
  const { v1Chunks, v2Chunks } = getChunks(chainId, marketAccounts)
  const nonEmptyV1Chunks = v1Chunks.filter(
    (accountsChunk) => accountsChunk.length > 0,
  )
  const nonEmptyV2Chunks = v2Chunks.filter(
    (accountsChunk) => accountsChunk.length > 0,
  )
  const lens =
    nonEmptyV1Chunks.length > 0 && hasDeploymentAddress(chainId, "MarketLens")
      ? getLensContract(chainId, provider)
      : undefined
  const lensV2 =
    nonEmptyV2Chunks.length > 0
      ? getLensV2Contract(chainId, provider)
      : undefined
  const v1MarketChunks = splitMarketRefreshChunks(nonEmptyV1Chunks)
  const v2MarketChunks = splitMarketRefreshChunks(nonEmptyV2Chunks)

  await Promise.all([
    ...(lens
      ? [
          refreshChunks(v1MarketChunks, async (accountsChunk) => {
            const updates = await lens.getMarketsData(
              accountsChunk.map(({ market }) => market.address),
            )
            accountsChunk.forEach(({ market }, index) => {
              market.updateWith(updates[index])
            })
          }),
        ]
      : []),
    ...(lensV2
      ? [
          refreshChunks(v2MarketChunks, async (accountsChunk) => {
            const updates = await lensV2.getMarketsData(
              accountsChunk.map(({ market }) => market.address),
            )
            accountsChunk.forEach(({ market }, index) => {
              market.updateWith(updates[index])
            })
          }),
        ]
      : []),
    ...[...nonEmptyV1Chunks, ...nonEmptyV2Chunks].map((accountsChunk) =>
      refreshLenderAccountState(chainId, provider, lender, accountsChunk),
    ),
  ])

  return marketAccounts
}
