import type { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

export const refetchOnMountIfInvalidated = (query: {
  state: { isInvalidated: boolean }
}) => query.state.isInvalidated

export const invalidateMarketListQueries = ({
  client,
  chainId,
  accountAddress,
}: {
  client: QueryClient
  chainId: number
  accountAddress?: string
}) => {
  client.invalidateQueries({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.PREFIX(
      chainId,
      accountAddress,
    ),
  })
  client.invalidateQueries({
    queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(chainId, accountAddress),
  })
  client.invalidateQueries({
    queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(chainId),
  })
}
