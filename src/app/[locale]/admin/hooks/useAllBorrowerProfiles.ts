"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerProfileForAdminView } from "@/app/api/profiles/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useAllBorrowerProfiles = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  return useQuery({
    queryKey: QueryKeys.Admin.GET_ALL_BORROWER_PROFILES(
      chainId,
      token?.isAdmin,
      token?.address,
    ),
    queryFn: async () => {
      const response = await fetch(`/api/profiles?chainId=${chainId}`, {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to fetch borrower profiles")
      }
      return (await response.json()) as BorrowerProfileForAdminView[]
    },
    enabled: token?.isAdmin,
    refetchInterval: 10_000,
  })
}
