import type { LazyQueryHookOptions } from "@apollo/client"
import { getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"

export const SubgraphClient = getSubgraphClient(TargetChainId)

export const lazyQueryOptions: LazyQueryHookOptions = {
  client: SubgraphClient as unknown as NonNullable<
    LazyQueryHookOptions["client"]
  >,
  nextFetchPolicy: "network-only",
}
