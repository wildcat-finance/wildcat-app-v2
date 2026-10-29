"use client"

import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { logger, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { LENDER_POLICY_HOOKS_ACCESS } from "@/graphql/queries"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { hasActivePullRoleProvider } from "@/utils/marketCapabilities"

type PolicyHooks = { id: string } | null

type HooksAccessResponse = {
  lenderHooksAccesses: {
    id: string
    lastProvider: { isApproved: boolean; pullProviderIndex: number } | null
    hooks: PolicyHooks
  }[]
}

const PAGE_SIZE = 1000

// Same cadence as the market catalogue this is consumed alongside
// (MARKET_CATALOG_POLLING_INTERVAL in useLendersMarkets).
const POLICY_MARKETS_REFRESH_INTERVAL = 60_000

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
 * Policy access does not imply a per-market interaction. A borrower adding a
 * lender to a policy grants on the hooks instance, which records a
 * lenderHooksAccess but no per-market LenderAccount row or role, so
 * MarketAccount.hasEverInteracted stays false. Read those direct hook grants
 * and resolve the hook IDs against the existing catalogue instead of fetching
 * another nested market list.
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

  const { data: accessHooks, isLoading: isAccessLoading } = useQuery({
    queryKey: [...queryKey, "hooks-access"],
    enabled: !!lender,
    refetchInterval: POLICY_MARKETS_REFRESH_INTERVAL,
    staleTime: POLICY_MARKETS_REFRESH_INTERVAL,
    refetchOnMount: (query) => query.state.isInvalidated,
    refetchOnWindowFocus: true,
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
        // Only an approved push grant is a policy grant. A lender who
        // self-onboards pulls a credential from the policy's open access
        // provider, which writes the same lenderHooksAccess; counting it would
        // list every sibling market of that policy as granted.
        return collectHooks(
          accesses.filter(
            ({ lastProvider }) =>
              lastProvider?.isApproved === true &&
              !hasActivePullRoleProvider([lastProvider]),
          ),
        )
      } catch (error) {
        logger.error("Failed to read policy hooks access", error)
        throw error
      }
    },
  })

  return useMemo(() => {
    const hooks = new Set(accessHooks ?? [])
    const policyMarkets = marketAccounts
      .filter(({ market }) => {
        const hooksAddress = market.hooksConfig?.hooksAddress.toLowerCase()
        return hooksAddress !== undefined && hooks.has(hooksAddress)
      })
      .map(({ market }) => market.address.toLowerCase())
      .sort()
    return {
      policyMarkets: new Set(policyMarkets),
      isPolicyMarketsLoading: isAccessLoading,
    }
  }, [marketAccounts, accessHooks, isAccessLoading])
}
