import type { Hex } from "viem"

import { fetchMorphoMarkets } from "./api"
import { MORPHO_DEPLOYMENTS } from "./constants"
import { evaluateMorphoMarket } from "./evaluate"
import { getMorphoMarketParams } from "./onchain"
import type { DestinationAdapter } from "../types"

export const morphoBlue: DestinationAdapter = {
  platform: "morpho-blue",
  accepts: ["wrapper"],
  load: async ({ chainId, tokens }) => {
    const deployment = MORPHO_DEPLOYMENTS[chainId]
    if (!deployment) throw new Error(`No Morpho deployment on chain ${chainId}`)
    if (tokens.length === 0) return []

    const markets = await fetchMorphoMarkets(
      chainId,
      tokens.map((token) => token.wrapper),
    )
    if (markets.length === 0) return []

    const onchain = await getMorphoMarketParams(
      chainId,
      deployment.blue,
      markets.map((market) => market.marketId as Hex),
    )

    return markets.flatMap((market) => {
      const output = evaluateMorphoMarket({
        appSlug: deployment.appSlug,
        market,
        onchain: onchain.get(market.marketId.toLowerCase()),
      })
      return output ? [output] : []
    })
  },
}
