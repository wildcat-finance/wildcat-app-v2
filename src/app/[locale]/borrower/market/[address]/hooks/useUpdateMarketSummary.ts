import { useMutation, useQueryClient } from "@tanstack/react-query"

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
          },
        },
      )
      if (!response.ok) {
        const message = await response
          .json()
          .then((body) => (body as { error?: string })?.error)
          .catch(() => undefined)
        throw Error(
          message ?? `Failed to save market description (${response.status})`,
        )
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["market-summary", chainId, market.toLowerCase()],
      })
    },
  })
}
