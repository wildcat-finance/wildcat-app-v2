import { useQuery } from "@tanstack/react-query"

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import {
  useIsSelectedNetworkRehydrated,
  useSelectedNetwork,
} from "@/hooks/useSelectedNetwork"
import { logger } from "@/lib/logging/client"
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
      logger.error(
        { status: response.status },
        "Error retrieving borrowers",
      )
      throw new Error(`Failed to retrieve borrower names: ${response.status}`)
    }
    const result = (await response.json()) as BorrowerWithName[]
    logger.info({ count: result.length }, "Got borrowers")
    return result
  }
  const { data } = useQuery({
    enabled: isSelectedNetworkRehydrated,
    queryKey: QueryKeys.User.GET_BORROWER_NAMES(chainId),
    queryFn: getBorrowers,
    refetchOnMount: false,
    staleTime: POLLING_INTERVALS.slow,
    refetchInterval: POLLING_INTERVALS.slow,
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
