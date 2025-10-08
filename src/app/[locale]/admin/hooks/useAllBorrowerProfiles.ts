"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerProfileForAdminView } from "@/app/api/profiles/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useAllBorrowerProfiles = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
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
      return (await response.json()) as BorrowerProfileForAdminView[]
    },
    enabled: token?.isAdmin,
    refetchInterval: 10_000,
  })
}
