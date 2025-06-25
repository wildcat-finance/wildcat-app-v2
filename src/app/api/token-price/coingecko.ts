import { TokenPrices } from "./interface"

export async function fetchCoingeckoTokenPrices(
  tokens: string[],
): Promise<TokenPrices> {
  const url = [
    "https://api.coingecko.com/api/v3/simple/token_price/ethereum?",
    `contract_addresses=${tokens.join(",")}&vs_currencies=usd`,
  ].join("")

  const API_KEY = process.env.COINGECKO_API_KEY as string
  if (!API_KEY) {
    throw new Error("COINGECKO_API_KEY is not set")
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": process.env.COINGECKO_API_KEY as string,
    },
  })
  const data = (await response.json()) as Record<string, { usd: number }>
  return Object.entries(data).reduce((acc, [tokenAddress, price]) => {
    acc[tokenAddress.toLowerCase()] = {
      usdPrice: price.usd,
      source: "coingecko",
    }
    return acc
  }, {} as TokenPrices)
}
