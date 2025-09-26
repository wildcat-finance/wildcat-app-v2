import { useQuery } from "@tanstack/react-query"
import { Token } from "@wildcatfi/wildcat-sdk"

import { TokenPrices } from "@/app/api/token-price/interface"
import { NETWORKS } from "@/config/network"
import { toMainnetToken } from "@/lib/token-conversion"

import { useCurrentNetwork } from "./useCurrentNetwork"

export async function fetchTokenPrices(tokens: string[]) {
  if (tokens.length === 0) return {}
  const response = await fetch(`/api/token-price?tokens=${tokens.join(",")}`)
  const data = await response.json()
  return data as TokenPrices
}

export const USE_GET_TOKEN_PRICES_QUERY_KEY = "use-get-token-prices"

export const useGetTokenPrices = (tokens: Token[]) => {
  const { isTestnet } = useCurrentNetwork()

  const queryTokens = (isTestnet ? tokens.map(toMainnetToken) : tokens)
    .filter((t, i) => !isTestnet || t.address !== tokens[i].address)
    .map((token) => token.address)
    .filter((token, index, self) => self.indexOf(token) === index)

  return useQuery({
    queryKey: [USE_GET_TOKEN_PRICES_QUERY_KEY, queryTokens],
    enabled: queryTokens.length > 0,
    queryFn: () =>
      fetchTokenPrices(queryTokens).then((data) => {
        if (isTestnet) {
          const outPrices = {} as TokenPrices
          tokens.forEach((token) => {
            const mainnetToken = toMainnetToken(token)
            const price = data[mainnetToken.address.toLowerCase()]
            if (price) {
              outPrices[token.address.toLowerCase()] = price
            }
          })
          console.log(`Token prices: ${JSON.stringify(outPrices, null, 2)}`)
          return outPrices
        }
        return data
      }),
  })
}
