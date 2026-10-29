import type { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

/**
 * A market mutation can change borrower and lender list projections at once.
 * Invalidate the whole chain family so cached views for another wallet do not
 * survive an account switch.
 */
export const invalidateMarketListQueries = ({
  client,
  chainId,
}: {
  client: QueryClient
  chainId: number
}) => {
  client.invalidateQueries({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.PREFIX(chainId),
  })
  client.invalidateQueries({
    queryKey: QueryKeys.Borrower.GET_OWN_MARKETS(chainId),
  })
  client.invalidateQueries({
    queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(chainId),
  })
}
