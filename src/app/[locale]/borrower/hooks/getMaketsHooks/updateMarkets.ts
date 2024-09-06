import {
  getLensContract,
  logger,
  Market,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { NETWORKS, TargetChainId } from "@/config/network"
import { TOKENS_ADDRESSES } from "@/utils/constants"

export async function updateMarkets(
  markets: Market[],
  provider: SignerOrProvider | undefined,
) {
  const lens = getLensContract(TargetChainId, provider as SignerOrProvider)
  let chunks: Market[][]

  if (TargetChainId === NETWORKS.Mainnet.chainId) {
    chunks = [
      ...markets
        .filter(
          (m) =>
            m.underlyingToken.address.toLowerCase() === TOKENS_ADDRESSES.WETH,
        )
        .map((m) => [m]),
      markets.filter(
        (m) =>
          m.underlyingToken.address.toLowerCase() !== TOKENS_ADDRESSES.WETH,
      ),
    ]
  } else {
    chunks = [markets]
  }

  await Promise.all(
    chunks.map(async (marketsChunk) => {
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
  )
  logger.debug(`Got ${markets.length} market updates`)
  return chunks.flat()
}
