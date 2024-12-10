import { useQuery } from "@tanstack/react-query"

// import { BorrowerInvitation } from "@/app/api/invite/interface"
import { useAuthToken } from "@/hooks/useApiAuth"

export const USE_BORROWER_INVITE_KEY = "use-borrower-invite"
export const USE_BORROWER_INVITE_EXISTS_KEY = "use-borrower-invite-exists"

export type BorrowerInvite = {
  address: string
  name?: string
  timeInvited: string
  timeAccepted?: string
  signature?: string
  messageHash?: string
  dateSigned?: string
  registeredMainnet?: number
  registeredSepolia?: number
}

interface BorrowerInvitation {
  id: number
  chainId: number
  address: string
  name: string
  timeInvited: Date
}

type BorrowerInvitationResponse = {
  inviteExists: boolean
  mustLogin: boolean
  invitation?: BorrowerInvitation
}

export const useGetBorrowerInvitation = (address: string | undefined) => {
  const token = useAuthToken()
  const getInvitation = async () => {
    if (!address) return undefined
    const exists = await fetch(`/api/invite/${address.toLowerCase()}`, {
      method: "HEAD",
    }).then((res) => res.status === 200)
    let invitation: BorrowerInvitation | undefined
    if (exists && token) {
      invitation = await fetch(`/api/invite/${address.toLowerCase()}`, {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
        .then((res) => res.json())
        .catch(() => undefined)
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

/**
 * The route for checking if a borrower has a pending invitation
 * is unauthenticated; however, the route for getting the invitation
 * details requires the user be logged in.
 */
export const useBorrowerInvitationExists = (address: string | undefined) => {
  const getInvitationExists = async () => {
    if (!address) return false
    const res = await fetch(`/api/invite/${address.toLowerCase()}`, {
      method: "HEAD",
    })
    return res.status === 200
  }
  const { data, ...result } = useQuery({
    enabled: !!address,
    queryKey: [USE_BORROWER_INVITE_EXISTS_KEY, address],
    queryFn: getInvitationExists,
    refetchOnMount: false,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}

export const useBorrowerInvitation = (address: string | undefined) => {
  const token = useAuthToken()
  const getInvites = async () => {
    if (!address) throw Error(`No address`)
    if (!token) throw Error(`No API token`)
    const { invitation } = await fetch(`/api/invite/${address.toLowerCase()}`, {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    })
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
