import { useQuery } from "@tanstack/react-query"

export const USE_BORROWER_INVITE_KEY = "use-borrower-invite"

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

export const useBorrowerInvitation = (address: string | undefined) => {
  const url = process.env.REACT_APP_API_URL as string | undefined
  const getInvites = async () => {
    if (!url) throw Error(`API url not defined`)
    if (!address) throw Error(`No address`)
    const { data } = await fetch(`${url}/borrowers/${address.toLowerCase()}`)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err)
        return undefined
      })
    return data === undefined ? null : (data as BorrowerInvite)
  }
  const { data, ...result } = useQuery({
    enabled: !!url && !!address,
    queryKey: [USE_BORROWER_INVITE_KEY, address],
    queryFn: getInvites,
    refetchOnMount: false,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}
