import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthToken } from "@/hooks/useApiAuth"

export const useUpdateMarketSummary = (market: string, chainId: number) => {
  const token = useAuthToken(chainId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["update-market-summary", chainId, market],
    mutationFn: (summary: string) => {
      if (!token || token.chainId !== chainId) {
        throw Error("No API token for market chain")
      }
      return fetch(`/api/market-summary/${market}?chainId=${chainId}`, {
        method: "POST",
        body: JSON.stringify({
          description: summary,
        }),
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      }).then((res) => res.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["market-summary", chainId, market.toLowerCase()],
      })
    },
  })
}
