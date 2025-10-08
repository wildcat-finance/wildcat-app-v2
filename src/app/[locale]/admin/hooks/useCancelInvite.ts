import { useMutation, useQueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export function useCancelInvite() {
  const token = useAuthToken()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
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
      ).then((res) => res.json())
      if (!response.success) {
        throw new Error("Failed to invite borrower")
      }
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(
          chainId,
          token?.isAdmin,
          token?.address,
        ),
      })
    },
  })
}
