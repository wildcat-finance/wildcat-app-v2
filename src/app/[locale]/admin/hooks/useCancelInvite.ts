import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthToken } from "@/hooks/useApiAuth"

import { GET_ALL_BORROWER_INVITATIONS_KEY } from "./useAllBorrowerInvitations"

export function useCancelInvite() {
  const token = useAuthToken()
  const client = useQueryClient()
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
      ).then((res) => res.json())
      if (!response.success) {
        throw new Error("Failed to invite borrower")
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_ALL_BORROWER_INVITATIONS_KEY] })
    },
  })
}
