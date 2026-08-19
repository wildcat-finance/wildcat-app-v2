import type { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

export const invalidateMarketAccountQueries = ({
  client,
  chainId,
  marketAddress,
  accountAddress,
}: {
  client: QueryClient
  chainId: number
  marketAddress: string
  accountAddress?: string
}) => {
  client.invalidateQueries({
    queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT_PREFIX(
      chainId,
      marketAddress,
    ),
  })

  if (accountAddress) {
    client.invalidateQueries({
      queryKey: QueryKeys.Borrower.GET_BORROWER_MARKET_ACCOUNT_LEGACY(
        chainId,
        accountAddress,
        marketAddress,
      ),
    })
  }
}
