import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
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
  const getBorrowers = async () => {
    const data = await fetch(`/api/borrower-names?chainId=${chainId}`)
      .then(async (res) => {
        const result = (await res.json()) as BorrowerWithName[]
        return result
      })
      .catch((err) => {
        console.log(err)
        return undefined
      })
    return data === undefined ? null : (data as BorrowerWithName[])
  }
  const { data, ...result } = useQuery({
    enabled: true,
    queryKey: QueryKeys.User.GET_BORROWER_NAMES(chainId),
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
  return getBorrowerDisplayName(address, borrowers.data)
}
