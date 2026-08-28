import type { QueryClient } from "@tanstack/react-query"

import { invalidateMarketAccountQueries } from "./marketAccountQueries"
import { invalidateMarketListQueries } from "./marketListQueries"

/** Refresh the affected account plus every list projection derived from it. */
export const invalidateMarketStateQueries = ({
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
  invalidateMarketAccountQueries({
    client,
    chainId,
    marketAddress,
    accountAddress,
  })
  invalidateMarketListQueries({ client, chainId })
}
