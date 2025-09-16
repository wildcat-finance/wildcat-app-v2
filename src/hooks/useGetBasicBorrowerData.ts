import { useQuery } from "@tanstack/react-query"
import { getBasicBorrowerData } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

export const GET_BASIC_BORROWER_DATA_KEY = "basicBorrowerData"

export const useGetBasicBorrowerData = (borrowerAddress?: string) => {
  const subgraphClient = useSubgraphClient()
  return useQuery({
    queryKey: [GET_BASIC_BORROWER_DATA_KEY, borrowerAddress],
    queryFn: () =>
      getBasicBorrowerData(
        subgraphClient,
        borrowerAddress?.toLowerCase() as string,
      ),
    enabled: !!borrowerAddress,
    refetchOnMount: false,
    refetchInterval: POLLING_INTERVAL,
  })
}
