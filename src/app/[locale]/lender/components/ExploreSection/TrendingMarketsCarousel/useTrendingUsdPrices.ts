import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { fetchTokenUsdPrices } from "@/lib/protocol-stats/queries"

export const useTrendingUsdPrices = (chainId: number, addresses: string[]) => {
  const sorted = useMemo(
    () => Array.from(new Set(addresses.map((a) => a.toLowerCase()))).sort(),
    [addresses],
  )

  return useQuery<Record<string, number>>({
    queryKey: ["trending-usd-prices", chainId, sorted],
    enabled: sorted.length > 0,
    queryFn: () => fetchTokenUsdPrices(chainId, sorted),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
