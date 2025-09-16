"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerProfileForAdminView } from "@/app/api/profiles/interface"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const GET_ALL_BORROWER_PROFILES_KEY = "GET_ALL_BORROWER_PROFILES"

export const useAllBorrowerProfiles = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  return useQuery({
    queryKey: [GET_ALL_BORROWER_PROFILES_KEY, token?.isAdmin, token?.address],
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
