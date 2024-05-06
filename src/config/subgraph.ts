import { getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"

export const SubgraphClient = getSubgraphClient(TargetChainId)
