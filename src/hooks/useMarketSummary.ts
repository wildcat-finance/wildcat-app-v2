import { useQuery } from "@tanstack/react-query"

import { MarketSummary } from "@/app/api/market-summary/[market]/dto"

export const useMarketSummaryExists = (market: string) =>
  useQuery({
    queryKey: ["market-summary", market],
    queryFn: () =>
      fetch(`/api/market-summary/${market}`, {
        method: "HEAD",
      }).then((res) => res.ok),
  })

export const useMarketSummary = (market: string) =>
  useQuery({
    queryKey: ["market-summary", market.toLowerCase()],
    refetchOnMount: false,
    queryFn: () =>
      fetch(`/api/market-summary/${market}`)
        .then((res) =>
          res.ok ? (res.json() as Promise<MarketSummary>) : undefined,
        )
        .catch(() => undefined),
  })
