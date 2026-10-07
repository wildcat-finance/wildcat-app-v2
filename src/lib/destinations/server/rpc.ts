import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getPublicClientForServer } from "@/lib/provider"

import { UPSTREAM_TIMEOUT_MS } from "../constants"

export const getDestinationsClient = (chainId: SupportedChainId) =>
  getPublicClientForServer(chainId, {
    timeout: UPSTREAM_TIMEOUT_MS,
    retryCount: 1,
  })
