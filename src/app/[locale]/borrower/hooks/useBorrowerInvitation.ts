import { useQuery } from "@tanstack/react-query"

import { BorrowerInvitation } from "@/app/api/invite/interface"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const USE_BORROWER_INVITE_KEY = "use-borrower-invite"
export const USE_BORROWER_INVITE_EXISTS_KEY = "use-borrower-invite-exists"

export const useGetBorrowerInvitation = (address: string | undefined) => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const getInvitation = async () => {
    if (!address) return undefined
    const exists = await fetch(
      `/api/invite/${address.toLowerCase()}?chainId=${chainId}`,
      {
        method: "HEAD",
      },
    ).then((res) => res.status === 200)
    let invitation: BorrowerInvitation | undefined
    if (exists && token) {
      const result = await fetch(
        `/api/invite/${address.toLowerCase()}?chainId=${chainId}`,
        {
          headers: {
            Authorization: `Bearer ${token.token}`,
          },
        },
      )
        .then((res) => res.json())
        .catch(() => undefined)
      invitation = result?.invitation
    }
    return {
      inviteExists: exists,
      mustLogin: !token,
      invitation,
    }
  }
  const { data, ...result } = useQuery({
    enabled: !!address,
    queryKey: [USE_BORROWER_INVITE_KEY, address, !!token],
    queryFn: getInvitation,
    refetchOnMount: false,
  })
  return { ...data, ...result }
}

export enum BorrowerInvitationStatus {
  PendingSignature,
  PendingRegistration,
}

/**
 * The route for checking if a borrower has a pending invitation
 * is unauthenticated; however, the route for getting the invitation
 * details requires the user be logged in.
 */
export const useBorrowerInvitationExists = (address: string | undefined) => {
  const { chainId } = useSelectedNetwork()
  const getInvitationExists = async () => {
    if (!address) return undefined
    const res = await fetch(
      `/api/invite/${address.toLowerCase()}?chainId=${chainId}`,
      {
        method: "HEAD",
      },
    )
    if (res.status === 404) return undefined
    if (res.headers.get("Signed") === "true")
      return BorrowerInvitationStatus.PendingRegistration
    return BorrowerInvitationStatus.PendingSignature
  }
  const { data, ...result } = useQuery({
    enabled: !!address,
    queryKey: [USE_BORROWER_INVITE_EXISTS_KEY, address],
    queryFn: getInvitationExists,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}

export const useBorrowerInvitation = (address: string | undefined) => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const getInvites = async () => {
    if (!address) throw Error(`No address`)
    if (!token) throw Error(`No API token`)
    const { invitation } = await fetch(
      `/api/invite/${address.toLowerCase()}?chainId=${chainId}`,
      {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      },
    )
      .then((res) => res.json())
      .catch((err) => {
        console.log(err)
        return undefined
      })
    return invitation === undefined ? null : (invitation as BorrowerInvitation)
  }
  const { data, ...result } = useQuery({
    enabled: !!address && !!token,
    queryKey: [USE_BORROWER_INVITE_KEY, address],
    queryFn: getInvites,
    refetchOnMount: false,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}
