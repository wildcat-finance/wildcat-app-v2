import {
  getLensContract,
  getLensV2Contract,
  logger,
  Market,
  MarketVersion,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { NetworkInfo, NETWORKS } from "@/config/network"
import { TOKENS_ADDRESSES } from "@/utils/constants"

export async function updateMarkets(
  markets: Market[],
  provider: SignerOrProvider | undefined,
  networkData: NetworkInfo,
) {
  const lens = getLensContract(
    networkData.chainId,
    provider as SignerOrProvider,
  )
  const lensV2 = getLensV2Contract(
    networkData.chainId,
    provider as SignerOrProvider,
  )
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

  await Promise.all([
    ...v1Chunks.map(async (marketsChunk) => {
      try {
        const updates = await lens.getMarketsData(
          marketsChunk.map((m) => m.address),
        )
        marketsChunk.forEach((market, i) => {
          market.updateWith(updates[i])
        })
      } catch (err) {
        console.log("Wrong underlying network detected", err)
      }
    }),
    ...v2Chunks.map(async (marketsChunk) => {
      try {
        const updates = await lensV2.getMarketsData(
          marketsChunk.map((m) => m.address),
        )
        marketsChunk.forEach((market, i) => {
          market.updateWith(updates[i])
        })
      } catch (err) {
        console.log("Wrong underlying network detected", err)
      }
    }),
  ])
  logger.debug(`Got ${markets.length} market updates`)
  return [...v1Chunks.flat(), ...v2Chunks.flat()]
}
