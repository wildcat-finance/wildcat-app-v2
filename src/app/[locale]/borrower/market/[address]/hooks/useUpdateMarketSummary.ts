import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthToken } from "@/hooks/useApiAuth"

export const useUpdateMarketSummary = (market: string) => {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["update-market-summary", market],
    mutationFn: (summary: string) =>
      fetch(`/api/market-summary/${market}`, {
        method: "POST",
        body: JSON.stringify({
          description: summary,
        }),
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["market-summary", market.toLowerCase()],
      })
    },
  })
}
