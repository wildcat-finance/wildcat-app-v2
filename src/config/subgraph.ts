import { LazyQueryHookOptions } from "@apollo/client"

import { TargetChainId } from "@/config/network"
import { getBrowserSubgraphClient } from "@/lib/subgraph/client"

export const SubgraphClient = getBrowserSubgraphClient(TargetChainId)

export const lazyQueryOptions: LazyQueryHookOptions = {
  client: SubgraphClient,
  nextFetchPolicy: "network-only",
}
