import { useMutation, useQueryClient } from "@tanstack/react-query"

import { BorrowerInvitationInput } from "@/app/api/invite/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useInviteBorrower = (address?: string) => {
  const token = useAuthToken()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
  return useMutation({
    mutationKey: ["inviteBorrower", address],
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
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(chainId),
      })
      const normalizedAddress = address?.toLowerCase()
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_PROFILE(chainId, normalizedAddress),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Borrower.GET_BORROWER_PROFILE(
          chainId,
          normalizedAddress,
        ),
      })
    },
  })
}
