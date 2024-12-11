"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerInvitationForAdminView } from "@/app/api/invite/interface"
import { useAuthToken } from "@/hooks/useApiAuth"

export const GET_ALL_BORROWER_INVITATIONS_KEY = "GET_ALL_BORROWER_INVITATIONS"

export const useAllBorrowerInvitations = () => {
  const token = useAuthToken()
  return useQuery({
    queryKey: [
      GET_ALL_BORROWER_INVITATIONS_KEY,
      token?.isAdmin,
      token?.address,
    ],
    queryFn: async () => {
      const response = await fetch("/api/invite?onlyPendingInvitations=true", {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
      return response.json() as Promise<BorrowerInvitationForAdminView[]>
    },
    enabled: token?.isAdmin,
    refetchInterval: 10_000,
  })
}
