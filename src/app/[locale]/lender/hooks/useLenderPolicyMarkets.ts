"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  logger,
  MarketAccount,
  usesLegacySubgraphSchema,
} from "@wildcatfi/wildcat-sdk"

import { LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { QueryKeys } from "@/config/query-keys"
import {
  LENDER_POLICY_ACCESS_LIST_HOOKS,
  LENDER_POLICY_ACCESS_LIST_MEMBERSHIPS,
  LENDER_POLICY_HOOKS_ACCESS,
} from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { refetchOnMountIfInvalidated } from "@/utils/queryRefetch"

type PolicyHooks = { id: string } | null

type AccessListResponse = {
  roleProviderMembers: { id: string; provider: { id: string } }[]
}

type AttachmentsResponse = {
  roleProviders: { id: string; hooks: PolicyHooks }[]
}

type HooksAccessResponse = {
  lenderHooksAccesses: {
    id: string
    lastProvider: { isApproved: boolean } | null
    hooks: PolicyHooks
  }[]
}

const PAGE_SIZE = 1000

async function getAllPages<T extends { id: string }>(
  fetchPage: (after: string) => Promise<T[]>,
): Promise<T[]> {
  const results: T[] = []
  let after = ""
  let page: T[]
  do {
    // Each cursor depends on the preceding page.
    // eslint-disable-next-line no-await-in-loop
    page = await fetchPage(after)
    results.push(...page)
    after = page[page.length - 1]?.id ?? after
  } while (page.length === PAGE_SIZE)
  return results
}

const collectHooks = (rows: { hooks: PolicyHooks }[]) =>
  [
    ...new Set(
      rows.flatMap(({ hooks }) => (hooks ? [hooks.id.toLowerCase()] : [])),
    ),
  ].sort()

/**
 * Policy access does not imply a per-market interaction. Read access-list
 * membership and direct hook grants independently, retaining each source's
 * last successful result if a later refresh fails. Resolve hook IDs against
 * the existing catalogue instead of fetching another nested market list.
 */
export const useLenderPolicyMarkets = (marketAccounts: MarketAccount[]) => {
  const subgraphClient = useSubgraphClient()
  const { targetChainId } = useCurrentNetwork()
  const { address } = useEthersProvider()
  const lender = address?.toLowerCase()
  const queryKey = QueryKeys.Lender.GET_LENDER_POLICY_HOOKS(
    targetChainId,
    lender,
  )
  const refreshOptions = {
    refetchInterval: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    staleTime: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    refetchOnMount: refetchOnMountIfInvalidated,
    refetchOnWindowFocus: true,
  }

  const { data: membershipHooks, isLoading: isMembershipLoading } = useQuery({
    ...refreshOptions,
    queryKey: [...queryKey, "access-list"],
    enabled: !!lender && !usesLegacySubgraphSchema(targetChainId),
    queryFn: async (): Promise<string[]> => {
      try {
        const members = await getAllPages((after) =>
          subgraphClient
            .query<AccessListResponse>({
              query: LENDER_POLICY_ACCESS_LIST_MEMBERSHIPS,
              variables: {
                first: PAGE_SIZE,
                where: { account: lender, isMember: true, id_gt: after },
              },
              fetchPolicy: "network-only",
            })
            .then(({ data }) => data.roleProviderMembers),
        )
        const providers = [
          ...new Set(members.map(({ provider }) => provider.id)),
        ]
        if (providers.length === 0) return []

        const attachments = await getAllPages((after) =>
          subgraphClient
            .query<AttachmentsResponse>({
              query: LENDER_POLICY_ACCESS_LIST_HOOKS,
              variables: {
                first: PAGE_SIZE,
                where: {
                  providerInstance_in: providers,
                  isApproved: true,
                  id_gt: after,
                },
              },
              fetchPolicy: "network-only",
            })
            .then(({ data }) => data.roleProviders),
        )
        return collectHooks(attachments)
      } catch (error) {
        logger.error("Failed to read policy access-list membership", error)
        throw error
      }
    },
  })

  const { data: accessHooks, isLoading: isAccessLoading } = useQuery({
    ...refreshOptions,
    queryKey: [...queryKey, "hooks-access"],
    enabled: !!lender,
    queryFn: async (): Promise<string[]> => {
      try {
        const accesses = await getAllPages((after) =>
          subgraphClient
            .query<HooksAccessResponse>({
              query: LENDER_POLICY_HOOKS_ACCESS,
              variables: {
                first: PAGE_SIZE,
                where: {
                  lender,
                  isBlockedFromDeposits: false,
                  id_gt: after,
                },
              },
              fetchPolicy: "network-only",
            })
            .then(({ data }) => data.lenderHooksAccesses),
        )
        // Preserve the existing historical-grant behavior for null providers.
        return collectHooks(
          accesses.filter(
            ({ lastProvider }) => lastProvider?.isApproved !== false,
          ),
        )
      } catch (error) {
        logger.error("Failed to read policy hooks access", error)
        throw error
      }
    },
  })

  return useMemo(() => {
    const hooks = new Set([...(membershipHooks ?? []), ...(accessHooks ?? [])])
    const policyMarkets = marketAccounts
      .filter(({ market }) => {
        const hooksAddress = market.hooksConfig?.hooksAddress.toLowerCase()
        return hooksAddress !== undefined && hooks.has(hooksAddress)
      })
      .map(({ market }) => market.address.toLowerCase())
      .sort()
    return {
      policyMarkets: new Set(policyMarkets),
      isPolicyMarketsLoading: isMembershipLoading || isAccessLoading,
    }
  }, [
    marketAccounts,
    membershipHooks,
    accessHooks,
    isMembershipLoading,
    isAccessLoading,
  ])
}
