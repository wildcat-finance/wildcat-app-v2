import { useMutation, useQueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"

export const useUpdateMarketSummary = (market: string, chainId: number) => {
  const token = useAuthToken(chainId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["update-market-summary", chainId, market],
    mutationFn: async (summary: string) => {
      if (!token || token.chainId !== chainId) {
        throw Error("No API token for market chain")
      }
      const response = await fetch(
        `/api/market-summary/${market}?chainId=${chainId}`,
        {
          method: "POST",
          body: JSON.stringify({
            description: summary,
          }),
          headers: {
            Authorization: `Bearer ${token.token}`,
            "Content-Type": "application/json",
          },
        },
      )
      if (!response.ok) {
        throw Error("Failed to update market summary")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_SUMMARY(
          chainId,
          market.toLowerCase(),
        ),
      })
      queryClient.invalidateQueries({
        queryKey: QueryKeys.Markets.GET_MARKET_SUMMARY_EXISTS(
          chainId,
          market.toLowerCase(),
        ),
      })
    },
  })
}
