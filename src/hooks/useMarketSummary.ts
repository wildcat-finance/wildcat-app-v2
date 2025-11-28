import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { MarketSummary } from "@/app/api/market-summary/[market]/dto"

export const useMarketSummaryExists = (market: string, chainId: number) =>
  useQuery({
    queryKey: ["market-summary", "exists", chainId, market.toLowerCase()],
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`, {
        method: "HEAD",
      }).then((res) => res.ok),
    placeholderData: keepPreviousData,
    enabled: !!market && !!chainId,
  })

export const useMarketSummary = (market: string, chainId: number) =>
  useQuery({
    queryKey: ["market-summary", "data", chainId, market.toLowerCase()],
    refetchOnMount: false,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`)
        .then((res) =>
          res.ok ? (res.json() as Promise<MarketSummary>) : undefined,
        )
        .catch(() => undefined),
    enabled: !!market && !!chainId,
  })
