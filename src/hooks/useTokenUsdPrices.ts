import { useMemo } from "react"

import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_TOKEN_USD_PRICES = gql`
  query getTokenUsdPrices($addresses: [Bytes!]!) {
    tokens(where: { address_in: $addresses }) {
      address
      isUsdStablecoin
    }
    tokenDailyPrices(
      first: 1000
      orderBy: timestamp
      orderDirection: desc
      where: { token_: { address_in: $addresses } }
    ) {
      priceUSD
      timestamp
      token {
        address
      }
    }
  }
`

type TokenUsdPricesQuery = {
  tokens: Array<{
    address: string
    isUsdStablecoin: boolean
  }>
  tokenDailyPrices: Array<{
    priceUSD: string
    timestamp: number
    token: { address: string }
  }>
}

export const fetchHinterlightTokenUsdPrices = async (
  chainId: number,
  addresses: string[],
) => {
  if (addresses.length === 0) return {}

  const client = getHinterlightClient(chainId)
  if (!client) return {}

  const normalized = Array.from(
    new Set(addresses.map((address) => address.toLowerCase())),
  )

  const result = await client.query<TokenUsdPricesQuery>({
    query: GET_TOKEN_USD_PRICES,
    variables: { addresses: normalized },
  })

  const prices: Record<string, number> = {}

  result.data.tokens.forEach((token) => {
    if (token.isUsdStablecoin) prices[token.address.toLowerCase()] = 1
  })

  // tokenDailyPrices is sorted desc by timestamp; first hit per token wins.
  result.data.tokenDailyPrices.forEach((point) => {
    const address = point.token.address.toLowerCase()
    if (prices[address] !== undefined) return
    const value = Number(point.priceUSD)
    if (Number.isFinite(value)) prices[address] = value
  })

  return prices
}

export const useTokenUsdPrices = (
  chainId: number,
  addresses: string[] | undefined,
) => {
  const sortedAddresses = useMemo(
    () =>
      Array.from(
        new Set((addresses ?? []).map((address) => address.toLowerCase())),
      ).sort(),
    [addresses],
  )

  return useQuery({
    queryKey: ["token", "HINTERLIGHT_USD_PRICES", chainId, sortedAddresses],
    enabled: isHinterlightSupported(chainId) && sortedAddresses.length > 0,
    queryFn: () => fetchHinterlightTokenUsdPrices(chainId, sortedAddresses),
    staleTime: 60_000,
    refetchOnMount: false,
  })
}
