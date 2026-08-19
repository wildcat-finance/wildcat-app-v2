// Admin mutation for the manual restriction override (product#789).
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { RestrictionOverride } from "@/utils/borrowerRestrictionState"

export const useSetBorrowerRestrictionOverride = (address: string) => {
  const token = useAuthToken()
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const isAdminForChain = token?.isAdmin && token.chainId === chainId
  return useMutation({
    mutationKey: ["setBorrowerRestrictionOverride", chainId, address],
    mutationFn: async (override: RestrictionOverride | null) => {
      if (!token || !isAdminForChain) {
        throw Error("Not authorized to set restriction overrides")
      }
      const response = await fetch(
        `/api/borrowers/${address.toLowerCase()}/restriction?chainId=${chainId}`,
        {
          method: "PUT",
          body: JSON.stringify({ override }),
          headers: {
            Authorization: `Bearer ${token.token}`,
            "Content-Type": "application/json",
          },
        },
      )
      if (response.status === 401) {
        removeBadToken()
      }
      if (!response.ok) {
        throw new Error("Failed to set restriction override")
      }
      return response.json()
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["borrower-restriction", chainId, address.toLowerCase()],
      })
    },
  })
}
