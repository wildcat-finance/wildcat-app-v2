import { LazyQueryHookOptions } from "@apollo/client"
import { getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"

export const SubgraphClient = getSubgraphClient(TargetChainId)

export const lazyQueryOptions: LazyQueryHookOptions = {
  client: SubgraphClient,
  nextFetchPolicy: "network-only",
}
