import { useQuery } from "@tanstack/react-query"
import {
  getAuthorisedLendersByMarket,
  getSubgraphClient,
  logger,
  Market,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"

export const useGetAuthorisedLendersByMarket = (market: Market | undefined) => {
  const subgraphClient = market?.chainId
    ? getSubgraphClient(market.chainId)
    : undefined
  const queryAuthorisedLenders = async () => {
    if (!market || !subgraphClient) throw Error()

    logger.debug(`Getting authorised lenders batches...`)

    const lenders = await getAuthorisedLendersByMarket(subgraphClient, {
      market: market.address,
      fetchPolicy: "network-only",
    })

    logger.debug(`Got ${lenders.length} authorised lenders`)
    return lenders.map((lender) => ({ lender, authorized: true }))
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_LENDERS_BY_MARKET(
      market?.chainId ?? 0,
      market?.address,
    ),
    queryFn: queryAuthorisedLenders,
    enabled: !!market && !!market.chainId,
    refetchOnMount: false,
  })
}
