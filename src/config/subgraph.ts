import type { LazyQueryHookOptions } from "@apollo/client"

import { TargetChainId } from "@/config/network"
import { getAppSubgraphClient } from "@/lib/gateway/client"

export const SubgraphClient = getAppSubgraphClient(TargetChainId)

export const lazyQueryOptions: LazyQueryHookOptions = {
  client: SubgraphClient as unknown as NonNullable<
    LazyQueryHookOptions["client"]
  >,
  nextFetchPolicy: "network-only",
}
