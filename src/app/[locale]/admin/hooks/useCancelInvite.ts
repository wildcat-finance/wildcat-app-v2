import { useMutation, useQueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export function useCancelInvite() {
  const token = useAuthToken()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  return useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch(
        `/api/invite?address=${address.toLowerCase()}&chainId=${chainId}`,
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
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(chainId),
      })
    },
  })
}
