import {
  getLensContract,
  hasDeploymentAddress,
  logger,
  Market,
  MarketVersion,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { NetworkInfo, NETWORKS } from "@/config/network"
import { TOKENS_ADDRESSES } from "@/utils/constants"
import { refreshMarketsV2LiveDataSafe } from "@/utils/marketV2Reads"

export type UpdateMarketsOptions = {
  throwOnError?: boolean
}

export async function updateMarkets(
  markets: Market[],
  provider: SignerOrProvider | undefined,
  networkData: NetworkInfo,
  { throwOnError = false }: UpdateMarketsOptions = {},
) {
  const hasV1Lens = hasDeploymentAddress(networkData.chainId, "MarketLens")
  const lens = hasV1Lens
    ? getLensContract(networkData.chainId, provider as SignerOrProvider)
    : undefined
  let v1Chunks: Market[][]
  let v2Chunks: Market[][]

  // The Mainnet deployment has legacy V1 markets deployed alongside V2 markets
  if (networkData.chainId === NETWORKS.Mainnet.chainId) {
    const wethMarkets = markets.filter(
      (m) => m.underlyingToken.address.toLowerCase() === TOKENS_ADDRESSES.WETH,
    )
    const nonWethMarkets = markets.filter(
      (m) => m.underlyingToken.address.toLowerCase() !== TOKENS_ADDRESSES.WETH,
    )
    v1Chunks = [
      ...wethMarkets
        .filter((m) => m.version === MarketVersion.V1)
        .map((m) => [m]),
      nonWethMarkets.filter((m) => m.version === MarketVersion.V1),
    ]
    v2Chunks = [
      ...wethMarkets
        .filter((m) => m.version === MarketVersion.V2)
        .map((m) => [m]),
      nonWethMarkets.filter((m) => m.version === MarketVersion.V2),
    ]
  } else {
    v1Chunks = [markets.filter((m) => m.version === MarketVersion.V1)]
    v2Chunks = [markets.filter((m) => m.version === MarketVersion.V2)]
  }

  const handleReadError = (err: unknown) => {
    if (throwOnError) throw err
    logger.debug("Failed to refresh market live data", err)
  }

  const hasV1Markets = v1Chunks.some((marketsChunk) => marketsChunk.length > 0)
  if (hasV1Markets && !lens) {
    handleReadError(
      new Error(
        `No V1 market lens configured for chain ${networkData.chainId}`,
      ),
    )
  }

  await Promise.all([
    ...(lens
      ? v1Chunks
          .filter((marketsChunk) => marketsChunk.length > 0)
          .map(async (marketsChunk) => {
            try {
              const updates = await lens.getMarketsData(
                marketsChunk.map((m) => m.address),
              )
              marketsChunk.forEach((market, i) => {
                market.updateWith(updates[i])
              })
            } catch (err) {
              handleReadError(err)
            }
          })
      : []),
    ...v2Chunks.map(async (marketsChunk) => {
      if (marketsChunk.length === 0) {
        return
      }
      try {
        const updates = await refreshMarketsV2LiveDataSafe(
          networkData.chainId,
          marketsChunk,
          provider as SignerOrProvider,
        )
        marketsChunk.forEach((market, i) => {
          Object.assign(market, updates[i])
        })
      } catch (err) {
        handleReadError(err)
      }
    }),
  ])
  logger.debug(`Got ${markets.length} market updates`)
  return [...v1Chunks.flat(), ...v2Chunks.flat()]
}
