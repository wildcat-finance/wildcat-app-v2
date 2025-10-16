import { useQuery } from "@tanstack/react-query"

import { MarketSummary } from "@/app/api/market-summary/[market]/dto"

export const useMarketSummaryExists = (market: string, chainId: number) =>
  useQuery({
    queryKey: ["market-summary", market.toLowerCase()],
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`, {
        method: "HEAD",
      }).then((res) => res.ok),
  })

export const useMarketSummary = (market: string, chainId: number) =>
  useQuery({
    queryKey: ["market-summary", market.toLowerCase()],
    refetchOnMount: false,
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`)
        .then((res) =>
          res.ok ? (res.json() as Promise<MarketSummary>) : undefined,
        )
        .catch(() => undefined),
  })
