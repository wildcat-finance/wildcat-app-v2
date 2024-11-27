import { useQuery } from "@tanstack/react-query"

import { TargetNetwork } from "@/config/network"
import { trimAddress } from "@/utils/formatters"

export const USE_REGISTERED_BORROWERS_KEY = "use-borrower-names"

export type BorrowerWithName = {
  address: string
  name?: string
}

export const useBorrowerNames = () => {
  const url = process.env.REACT_APP_API_URL as string | undefined
  const getBorrowers = async () => {
    if (!url) throw Error(`API url not defined`)
    const { data } = await fetch(
      `${url}/borrowers/registered/${TargetNetwork?.name.toLowerCase()}`,
    )
      .then((res) => res.json())
      .catch((err) => {
        console.log(err)
        return undefined
      })
    return data === undefined ? null : (data as BorrowerWithName[])
  }
  const { data, ...result } = useQuery({
    enabled: !!url,
    queryKey: [USE_REGISTERED_BORROWERS_KEY],
    queryFn: getBorrowers,
    refetchOnMount: false,
    refetchInterval: 10_000,
  })
  return {
    data: data === null ? undefined : data,
    ...result,
  }
}

export const useBorrowerNameOrAddress = (address: string): string => {
  const borrowers = useBorrowerNames()
  if (!borrowers.data) return trimAddress(address)
  const borrower = borrowers.data.find(
    (b) => b.address.toLowerCase() === address.toLowerCase(),
  )
  return borrower?.name ?? trimAddress(address)
}
