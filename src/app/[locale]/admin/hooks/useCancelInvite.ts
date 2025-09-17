import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"

import { GET_ALL_BORROWER_INVITATIONS_KEY } from "./useAllBorrowerInvitations"

export function useCancelInvite() {
  const token = useAuthToken()
  const client = useQueryClient()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  return useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch(
        `/api/invite?address=${address.toLowerCase()}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token.token}`,
          },
        },
      )
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to cancel invite")
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error("Failed to cancel invite")
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_ALL_BORROWER_INVITATIONS_KEY] })
    },
  })
}
