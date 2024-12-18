import { useMutation, useQueryClient } from "@tanstack/react-query"

import { BorrowerInvitationInput } from "@/app/api/invite/interface"
import { useAuthToken } from "@/hooks/useApiAuth"

import { GET_ALL_BORROWER_INVITATIONS_KEY } from "./useAllBorrowerInvitations"

export const useInviteBorrower = () => {
  const token = useAuthToken()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (data: BorrowerInvitationInput) => {
      const response = await fetch("/api/invite", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      }).then((res) => res.json())
      if (!response.success) {
        throw new Error("Failed to invite borrower")
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_ALL_BORROWER_INVITATIONS_KEY] })
    },
  })
}
