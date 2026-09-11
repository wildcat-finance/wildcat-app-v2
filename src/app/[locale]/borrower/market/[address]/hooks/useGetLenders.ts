import { useQuery } from "@tanstack/react-query"
import { Market } from "@wildcatfi/wildcat-sdk"
import {
  GetAuthorizedLendersByMarketDocument,
  SubgraphGetAuthorizedLendersByMarketQuery,
  SubgraphGetAuthorizedLendersByMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"

import { QueryKeys } from "@/config/query-keys"
import { getBrowserSubgraphClient } from "@/lib/subgraph/client"

export const useGetAuthorisedLendersByMarket = (market: Market | undefined) => {
  const subgraphClient = market?.chainId
    ? getBrowserSubgraphClient(market.chainId)
    : undefined
  const getAuthorisedLendersByMarket = async () => {
    if (!market || !subgraphClient) throw Error()

    logger.debug(`Getting authorised lenders batches...`)

    const res = await subgraphClient.query<
      SubgraphGetAuthorizedLendersByMarketQuery,
      SubgraphGetAuthorizedLendersByMarketQueryVariables
    >({
      query: GetAuthorizedLendersByMarketDocument,
      variables: { market: market.address.toLowerCase() },
    })

    logger.debug(
      `Got authorised lenders : ${res.data.market?.controller?.authorizedLenders}`,
    )
    return res.data?.market?.controller?.authorizedLenders.map(
      (lender) => lender,
    )
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_LENDERS_BY_MARKET(
      market?.chainId ?? 0,
      market?.address,
    ),
    queryFn: getAuthorisedLendersByMarket,
    enabled: !!market && !!market.chainId,
    refetchOnMount: false,
  })
}
