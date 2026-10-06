import type { QueryClient } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"

export const SLA_STATUS_QUERY_KEY = "sla-status"
export const HAS_SIGNED_SLA_KEY = "has-signed-sla"

export const invalidateToUQueries = (
  client: QueryClient,
  chainId: number,
  address: string | undefined,
) =>
  Promise.all([
    client.invalidateQueries({
      queryKey: [SLA_STATUS_QUERY_KEY],
      exact: false,
    }),
    client.invalidateQueries({ queryKey: [HAS_SIGNED_SLA_KEY] }),
    client.invalidateQueries({
      queryKey: QueryKeys.ServiceAgreement.GET_STATUS(chainId, address),
    }),
  ])
