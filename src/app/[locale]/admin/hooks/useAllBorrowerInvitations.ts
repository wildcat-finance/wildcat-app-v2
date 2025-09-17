"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerInvitationForAdminView } from "@/app/api/invite/interface"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"

export const GET_ALL_BORROWER_INVITATIONS_KEY = "GET_ALL_BORROWER_INVITATIONS"

export const useAllBorrowerInvitations = () => {
  const token = useAuthToken()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
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
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to fetch borrower invitations")
      }
      const invitations = (await response.json()).map(
        (x: BorrowerInvitationForAdminView) => ({
          ...x,
          timeInvited: x.timeInvited ? new Date(x.timeInvited) : undefined,
          timeSigned: x.timeSigned ? new Date(x.timeSigned) : undefined,
        }),
      ) as BorrowerInvitationForAdminView[]
      invitations.sort((a, b) => {
        if (a.timeSigned && b.timeSigned) {
          return +b.timeSigned - +a.timeSigned
        }
        return +b.timeInvited - +a.timeInvited
      })
      invitations.sort((a, b) => {
        // If a borrower has `timeSigned` but not `registeredOnChain`, it should be prioritized.
        // Then, sort by `timeInvited`
        const aSigned = a.timeSigned && !a.registeredOnChain
        const bSigned = b.timeSigned && !b.registeredOnChain
        if (aSigned && !bSigned) return -1
        if (!aSigned && bSigned) return 1
        return 0
      })
      return invitations
    },
    enabled: token?.isAdmin,
    refetchInterval: 10_000,
  })
}
