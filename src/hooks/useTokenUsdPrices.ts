import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  getLatestTokenUsdPrices,
  IndexedTokenUsdPrice,
} from "@wildcatfi/wildcat-sdk"

import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

export type TokenUsdPricesResult = {
  prices: Record<string, number>
  unpriced: Record<
    string,
    Extract<IndexedTokenUsdPrice, { status: "unpriced" }>["reason"]
  >
}

export const fetchIndexedTokenUsdPrices = async (
  chainId: number,
  addresses: string[],
): Promise<TokenUsdPricesResult> => {
  if (addresses.length === 0) return { prices: {}, unpriced: {} }

  const client = getConfiguredSubgraphClient(chainId)
  if (!client) return { prices: {}, unpriced: {} }

  const normalized = Array.from(
    new Set(addresses.map((address) => address.toLowerCase())),
  )
  const result = await getLatestTokenUsdPrices(client, {
    tokens: normalized,
    fetchPolicy: "network-only",
  })
  return result.prices.reduce<TokenUsdPricesResult>(
    (mapped, price) => {
      const address = price.address.toLowerCase()
      if (price.status === "unpriced") {
        mapped.unpriced[address] = price.reason
        return mapped
      }
      const value = Number(price.priceUSD)
      if (Number.isFinite(value)) mapped.prices[address] = value
      else mapped.unpriced[address] = "no-observation"
      return mapped
    },
    { prices: {}, unpriced: {} },
  )
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
    queryKey: ["token", "INDEXED_USD_PRICES", chainId, sortedAddresses],
    enabled: isSubgraphPricingConfigured(chainId) && sortedAddresses.length > 0,
    queryFn: () => fetchIndexedTokenUsdPrices(chainId, sortedAddresses),
    staleTime: 60_000,
    refetchOnMount: false,
  })
}
