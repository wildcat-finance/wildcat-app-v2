import { useQuery } from "@tanstack/react-query"

import { MarketSummary } from "@/app/api/market-summary/[market]/dto"
import { QueryKeys } from "@/config/query-keys"

export const fetchMarketSummary = async (
  market: string,
  chainId: number,
): Promise<MarketSummary | undefined> =>
  fetch(`/api/market-summary/${market}?chainId=${chainId}`)
    .then((res) =>
      res.ok ? (res.json() as Promise<MarketSummary>) : undefined,
    )
    .catch(() => undefined)

export const useMarketSummaryExists = (market: string, chainId: number) =>
  useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_SUMMARY_EXISTS(
      chainId,
      market.toLowerCase(),
    ),
    queryFn: () =>
      fetch(`/api/market-summary/${market}?chainId=${chainId}`, {
        method: "HEAD",
      }).then((res) => res.ok),
  })

export const useMarketSummary = (market: string, chainId: number) =>
  useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_SUMMARY(
      chainId,
      market.toLowerCase(),
    ),
    refetchOnMount: false,
    queryFn: () => fetchMarketSummary(market, chainId),
  })
