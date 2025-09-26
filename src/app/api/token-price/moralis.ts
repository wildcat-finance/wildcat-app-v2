import { TokenPrices } from "./interface"

export type MoralisTokenPriceResponse = {
  tokenName: string
  tokenSymbol: string
  tokenLogo: string
  tokenDecimals: string
  nativePrice: {
    value: string
    decimals: number
    name: string
    symbol: string
    address: string
  }
  usdPrice: number
  usdPriceFormatted: string
  exchangeName: string
  exchangeAddress: string
  tokenAddress: string
  priceLastChangedAtBlock: string
  blockTimestamp: string
  possibleSpam: boolean
  verifiedContract: boolean
  pairAddress: string
  pairTotalLiquidityUsd: string
  securityScore: number
  usdPrice24hr: number
  usdPrice24hrUsdChange: number
  usdPrice24hrPercentChange: number
  "24hrPercentChange": string
}

export async function fetchMoralisTokenPrices(
  tokens: string[],
): Promise<TokenPrices> {
  const url = `https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=eth`
  const API_KEY = process.env.MORALIS_API_KEY as string
  if (!API_KEY) {
    throw new Error("MORALIS_API_KEY is not set")
  }

  if (tokens.length === 0) {
    return {}
  }
  if (tokens.length > 100) {
    // @todo: chunk the tokens into batches of 100 and fetch the prices in parallel
    throw new Error("Moralis API only supports up to 100 tokens")
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      tokens: tokens.map((t) => ({
        token_address: t,
      })),
    }),
  })
  const data = (await response.json()) as
    | MoralisTokenPriceResponse[]
    | { message: string }
  if ("message" in data) {
    throw new Error(data.message)
  }
  return data.reduce((acc, curr) => {
    acc[curr.tokenAddress.toLowerCase()] = {
      usdPrice: curr.usdPrice,
      source: "moralis",
    }
    return acc
  }, {} as TokenPrices)
}
