import { useQuery } from "@tanstack/react-query"

type MarketSummaryResponse = { description: string | null }

export const useMarketSummary = (market: string, chainId: number) =>
  useQuery({
    queryKey: ["market-summary", market.toLowerCase()],
    refetchOnMount: false,
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`)
        .then((res) => res.json() as Promise<MarketSummaryResponse>)
        .catch(() => null),
  })
