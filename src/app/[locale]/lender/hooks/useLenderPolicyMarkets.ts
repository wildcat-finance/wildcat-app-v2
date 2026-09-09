"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { logger, usesLegacySubgraphSchema } from "@wildcatfi/wildcat-sdk"

import { LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { QueryKeys } from "@/config/query-keys"
import {
  LENDER_POLICY_ACCESS_LIST_MARKETS,
  LENDER_POLICY_HOOKS_ACCESS_MARKETS,
} from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { refetchOnMountIfInvalidated } from "@/utils/queryRefetch"

type PolicyHooks = { markets: { id: string }[] } | null

type AccessListResponse = {
  roleProviderMembers: {
    provider: {
      attachments: { hooks: PolicyHooks }[]
    }
  }[]
}

type HooksAccessResponse = {
  lenderHooksAccesses: {
    lastProvider: { isApproved: boolean } | null
    hooks: PolicyHooks
  }[]
}

/**
 * Addresses of the markets a lender was given access to through a policy.
 *
 * Nothing else the dashboard fetches knows such a grant happened: neither
 * shape of it writes a per-market LenderAccount row, a credential or a role,
 * so MarketAccount.hasEverInteracted stays false and the market is routed away
 * from My Markets entirely.
 *
 * Both shapes have to be read, because a lender found by one is not found by
 * the other. A pull provider (ACCESS_LIST) records only a roleProviderMember —
 * the hook does not consult it until the lender first acts on a market, so no
 * hooks access exists yet. A push provider grants on the hooks instance, which
 * records a lenderHooksAccess and no membership row at all.
 *
 * They go out as two requests, not one. The legacy schema (mainnet, plasma)
 * has no roleProviderMembers field, and a single document naming it fails
 * outright there — which would lose the hooks-access half too, although that
 * half is answerable on both schemas. So membership is skipped where the
 * schema cannot answer it, and one side failing never silences the other.
 *
 * getLenderAccountsForAllMarkets offers no way to learn that a lender holds
 * access to a market they have not transacted on yet. This hook is a stand-in
 * for that gap and should be deleted once the SDK closes it.
 */
export const useLenderPolicyMarkets = () => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId } = useCurrentNetwork()
  const { address } = useEthersProvider()

  const lender = address?.toLowerCase()

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.Lender.GET_LENDER_POLICY_MARKETS(targetChainId, lender),
    enabled: !!lender,
    // The grant happens in the borrower's browser, so nothing in this session
    // can invalidate on it. The lender has to notice on their own, which is why
    // this carries the same refresh contract as the market accounts it is
    // consumed alongside: picked up within the interval, or at once when the
    // tab regains focus.
    refetchInterval: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    staleTime: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    refetchOnMount: refetchOnMountIfInvalidated,
    refetchOnWindowFocus: true,
    // An array rather than a Set, so React Query's structural sharing keeps the
    // reference stable across refetches that changed nothing.
    queryFn: async (): Promise<string[]> => {
      const addresses = new Set<string>()
      const collect = (hooks: PolicyHooks) => {
        hooks?.markets.forEach(({ id }) => addresses.add(id.toLowerCase()))
      }

      // Asking the legacy schema for membership is a guaranteed error on every
      // refresh, so do not spend the request.
      const canReadMembership = !usesLegacySubgraphSchema(targetChainId)

      const [membership, hooksAccess] = await Promise.allSettled([
        canReadMembership
          ? subgraphClient.query<AccessListResponse>({
              query: LENDER_POLICY_ACCESS_LIST_MARKETS,
              variables: { lender },
              fetchPolicy: "network-only",
            })
          : Promise.resolve(undefined),
        subgraphClient.query<HooksAccessResponse>({
          query: LENDER_POLICY_HOOKS_ACCESS_MARKETS,
          variables: { lender },
          fetchPolicy: "network-only",
        }),
      ])

      if (membership.status === "rejected") {
        logger.error(
          `Failed to read policy access-list membership`,
          membership.reason,
        )
      } else if (membership.value) {
        membership.value.data.roleProviderMembers.forEach(({ provider }) => {
          provider.attachments.forEach(({ hooks }) => collect(hooks))
        })
      }

      if (hooksAccess.status === "rejected") {
        logger.error(`Failed to read policy hooks access`, hooksAccess.reason)
      } else {
        hooksAccess.value.data.lenderHooksAccesses.forEach(
          ({ lastProvider, hooks }) => {
            // Only an explicitly unapproved provider is dropped. The access row
            // itself is the record that the hook granted access; a missing
            // lastProvider should not hide a grant the borrower did make.
            if (lastProvider?.isApproved === false) return
            collect(hooks)
          },
        )
      }

      // Every side we asked failing is an error, not "this lender holds no
      // policy access" — reporting it as the latter would quietly drop markets
      // the lender does hold.
      if (
        hooksAccess.status === "rejected" &&
        (!canReadMembership || membership.status === "rejected")
      ) {
        throw hooksAccess.reason
      }

      return [...addresses].sort()
    },
  })

  return useMemo(
    () => ({
      policyMarkets: new Set(data ?? []),
      isPolicyMarketsLoading: isLoading,
    }),
    [data, isLoading],
  )
}
