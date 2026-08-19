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

const getValidBorrowerLabel = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed === "" ? undefined : trimmed
}

export const getBorrowerDisplayName = (
  address: string,
  borrowers: BorrowerWithName[] | undefined,
  preferredLabel: "alias" | "name" = "alias",
) => {
  const borrower = borrowers?.find(
    (b) => b.address.toLowerCase() === address.toLowerCase(),
  )
  const alias = getValidBorrowerLabel(borrower?.alias)
  const name = getValidBorrowerLabel(borrower?.name)

  return preferredLabel === "name"
    ? name ?? alias ?? trimAddress(address)
    : alias ?? name ?? trimAddress(address)
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
  const { data, ...result } = useQuery({
    enabled: isSelectedNetworkRehydrated && !!chainId,
    queryKey: QueryKeys.User.GET_BORROWER_NAMES(chainId),
    queryFn: getBorrowers,
    refetchOnMount: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  return {
    data,
    ...result,
  }
}

export const useBorrowerNameOrAddress = (address: string): string => {
  const borrowers = useBorrowerNames()
  return getBorrowerDisplayName(address, borrowers.data)
}
