export type TokenPriceResponse = {
  usdPrice: number
  source: "coingecko" | "moralis"
}

export type TokenPrices = Record<string, TokenPriceResponse>
