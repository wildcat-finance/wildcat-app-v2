import { useQuery } from "@tanstack/react-query"
import { getBasicBorrowerData } from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"

const GET_BASIC_BORROWER_DATA_KEY = "basicBorrowerData"

export const useGetBasicBorrowerData = (borrowerAddress?: string) =>
  useQuery({
    queryKey: [GET_BASIC_BORROWER_DATA_KEY],
    queryFn: () =>
      getBasicBorrowerData(
        SubgraphClient,
        borrowerAddress?.toLowerCase() as string,
      ),
    enabled: !!borrowerAddress,
    refetchOnMount: false,
    refetchInterval: POLLING_INTERVAL,
  })
