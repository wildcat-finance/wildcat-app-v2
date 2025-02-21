import { useQuery } from "@tanstack/react-query"
import { getBasicBorrowerData } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"

export const GET_BASIC_BORROWER_DATA_KEY = "basicBorrowerData"

export const useGetBasicBorrowerData = (borrowerAddress?: string) =>
  useQuery({
    queryKey: [GET_BASIC_BORROWER_DATA_KEY, borrowerAddress],
    queryFn: () =>
      getBasicBorrowerData(
        SubgraphClient,
        borrowerAddress?.toLowerCase() as string,
      ),
    enabled: !!borrowerAddress,
    refetchOnMount: false,
    refetchInterval: POLLING_INTERVAL,
  })
