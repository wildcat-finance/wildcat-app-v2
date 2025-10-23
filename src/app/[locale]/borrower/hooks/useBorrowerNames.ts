import { useQuery } from "@tanstack/react-query"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { trimAddress } from "@/utils/formatters"

export const USE_REGISTERED_BORROWERS_KEY = "use-borrower-names"

export type BorrowerWithName = {
  address: string
  name?: string
  alias?: string
}

export const useBorrowerNames = () => {
  const { chainId } = useSelectedNetwork()
  const getBorrowers = async () => {
    const data = await fetch(`/api/borrower-names?chainId=${chainId}`)
      .then(async (res) => {
        const result = (await res.json()) as BorrowerWithName[]
        console.log(`GOT ${result.length} BORROWERS`)
        return result
      })
      .catch((err) => {
        console.log(err)
        console.log(`ERROR RETRIEVING BORROWERS`)
        return undefined
      })
    return data === undefined ? null : (data as BorrowerWithName[])
  }
  const { data, ...result } = useQuery({
    enabled: true,
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

  return borrower?.alias ?? borrower?.name ?? trimAddress(address)
}
