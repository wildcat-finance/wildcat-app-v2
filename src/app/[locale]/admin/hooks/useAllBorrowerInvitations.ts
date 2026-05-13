"use client"

import { useQuery } from "@tanstack/react-query"

import { BorrowerInvitationForAdminView } from "@/app/api/invite/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useAllBorrowerInvitations = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const isAdminForChain = token?.isAdmin && token.chainId === chainId
  return useQuery({
    queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(
      chainId,
      isAdminForChain,
      token?.address,
    ),
    queryFn: async () => {
      const response = await fetch(
        `/api/invite?onlyPendingInvitations=true&chainId=${chainId}`,
        {
          headers: {
            Authorization: `Bearer ${token.token}`,
          },
        },
      )
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
    enabled: !!isAdminForChain,
    refetchInterval: 10_000,
  })
}
