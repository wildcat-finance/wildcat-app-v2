import { useQuery } from "@tanstack/react-query"
import { getBasicBorrowerData } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const useGetBasicBorrowerData = (borrowerAddress?: string) => {
  const subgraphClient = useSubgraphClient()
  const { chainId } = useSelectedNetwork()
  const borrowerAddressLower = borrowerAddress?.toLowerCase()

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_BASIC_BORROWER_DATA(
      chainId,
      borrowerAddressLower,
    ),
    queryFn: () =>
      getBasicBorrowerData(subgraphClient, borrowerAddressLower as string),
    enabled: !!borrowerAddressLower && !!chainId,
    refetchOnMount: false,
    refetchInterval: POLLING_INTERVALS.default,
  })
}
