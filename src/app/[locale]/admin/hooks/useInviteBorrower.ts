import { useMutation, useQueryClient } from "@tanstack/react-query"

import { BorrowerInvitationInput } from "@/app/api/invite/interface"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"

import { GET_ALL_BORROWER_INVITATIONS_KEY } from "./useAllBorrowerInvitations"
import { BORROWER_PROFILE_KEY } from "../../borrower/profile/hooks/useGetBorrowerProfile"

export const useInviteBorrower = (address?: string) => {
  const token = useAuthToken()
  const client = useQueryClient()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  return useMutation({
    mutationKey: ["inviteBorrower", address],
    mutationFn: async (data: BorrowerInvitationInput) => {
      const response = await fetch("/api/invite", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to invite borrower")
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error("Failed to invite borrower")
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [GET_ALL_BORROWER_INVITATIONS_KEY] })
      client.invalidateQueries({ queryKey: [BORROWER_PROFILE_KEY, address] })
    },
  })
}
