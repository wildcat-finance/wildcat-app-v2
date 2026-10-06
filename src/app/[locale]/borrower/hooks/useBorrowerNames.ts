import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import {
  useIsSelectedNetworkRehydrated,
  useSelectedNetwork,
} from "@/hooks/useSelectedNetwork"
import { trimAddress } from "@/utils/formatters"

export type BorrowerWithName = {
  address: string
  name?: string
  alias?: string
}

export const useBorrowerNames = () => {
  const { chainId } = useSelectedNetwork()
  const isSelectedNetworkRehydrated = useIsSelectedNetworkRehydrated()
  const getBorrowers = async () => {
    const response = await fetch(`/api/borrower-names?chainId=${chainId}`)
    if (!response.ok) {
      throw new Error(`Failed to retrieve borrower names: ${response.status}`)
    }
    return (await response.json()) as BorrowerWithName[]
  }
  const { data } = useQuery({
    enabled: isSelectedNetworkRehydrated,
    queryKey: QueryKeys.User.GET_BORROWER_NAMES(chainId),
    queryFn: getBorrowers,
    refetchOnMount: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  return {
    data,
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
