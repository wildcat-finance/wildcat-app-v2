"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerOrganisation } from "@/app/api/borrowers/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

/// Every borrowing organisation of the selected network's class (admin only).
export const useBorrowerOrganisations = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const isAdminForChain = token?.isAdmin && token.chainId === chainId
  return useQuery({
    queryKey: QueryKeys.Admin.GET_BORROWER_ORGANISATIONS(
      chainId,
      token?.address,
    ),
    queryFn: async () => {
      const response = await fetch(`/api/borrowers?chainId=${chainId}`, {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to fetch borrowers")
      }
      if (!response.ok) throw Error("Failed to fetch borrowers")
      return (await response.json()) as BorrowerOrganisation[]
    },
    enabled: !!isAdminForChain,
  })
}
