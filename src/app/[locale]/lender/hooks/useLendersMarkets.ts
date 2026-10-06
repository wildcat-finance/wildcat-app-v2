/* eslint-disable camelcase */
import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  MarketAccount,
  SubgraphGetLenderMarketCatalogueQueryVariables,
  getLenderMarketCatalogue,
  SubgraphMarket_Filter,
} from "@wildcatfi/wildcat-sdk"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"
import { constants } from "ethers"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useIsSelectedNetworkRehydrated } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { EXCLUDED_MARKETS_FILTER } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"
import {
  getSubgraphMarketOnboardingMode,
  MarketOnboardingByAddress,
} from "@/utils/marketOnboarding"
import { isFrontendVisibleMarket } from "@/utils/marketType"
import { TwoStepQueryHookResult } from "@/utils/types"

import { refreshLenderMarketAccounts } from "./refreshLenderMarketAccounts"

export type LenderMarketsQueryProps = Omit<
  SubgraphGetLenderMarketCatalogueQueryVariables,
  "lender"
>

type LenderMarketUpdates = {
  marketAccounts: MarketAccount[]
  onboardingByMarket: MarketOnboardingByAddress
  queryIdentity: string
}

export type LenderMarketsOnboardingStatus = "loading" | "ready" | "error"

const MARKET_CATALOG_POLLING_INTERVAL = 60_000
// Live market and lender-account refresh cadence.
const MARKET_LIVE_REFRESH_INTERVAL = 60_000

export type LenderMarketsResult = TwoStepQueryHookResult<
  MarketAccount[],
  LenderMarketUpdates
> & {
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
}

export function useLendersMarkets(
  filters: LenderMarketsQueryProps = {},
): LenderMarketsResult {
  const { isWrongNetwork, provider, signer, address } = useEthersProvider()
  const { targetChainId } = useCurrentNetwork()
  const subgraphClient = useSubgraphClient()
  const isSelectedNetworkRehydrated = useIsSelectedNetworkRehydrated()
  const signerOrProvider = signer ?? provider

  const lender = address?.toLowerCase()
  const filtersKey = JSON.stringify(filters)
  const updateQueryIdentity = `${targetChainId}:${
    lender ?? constants.AddressZero
  }:${filtersKey}`

  async function queryMarketsForLender() {
    logger.debug(`Getting all markets...`)
    if (!signerOrProvider) throw Error(`no provider`)
    const { marketFilter, ...otherFilters } = filters
    const filter = combineFilters([
      { ...marketFilter },
      ...EXCLUDED_MARKETS_FILTER,
    ]) as SubgraphMarket_Filter
    // Catalogue query: current indexed state only, no raw event history.
    // network-only because react-query owns freshness here - Apollo's cache
    // would otherwise satisfy the 60s poll without hitting the subgraph.
    const { accounts: lenderAccounts } = await getLenderMarketCatalogue(
      subgraphClient,
      {
        ...otherFilters,
        lender: lender ?? constants.AddressZero,
        fetchPolicy: "network-only",
        chainId: targetChainId,
        signerOrProvider,
        marketFilter: filter,
      },
    )
    const visibleAccounts = lenderAccounts.filter(({ market }) =>
      isFrontendVisibleMarket(market),
    )
    visibleAccounts.sort(
      (a, b) =>
        (b.market.deployedEvent?.blockNumber ?? 0) -
        (a.market.deployedEvent?.blockNumber ?? 0),
    )
    return visibleAccounts
  }

  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
    dataUpdatedAt: catalogUpdatedAt,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
      targetChainId,
      lender,
      filtersKey,
    ),
    queryFn: queryMarketsForLender,
    refetchInterval: MARKET_CATALOG_POLLING_INTERVAL,
    staleTime: MARKET_CATALOG_POLLING_INTERVAL,
    enabled:
      isSelectedNetworkRehydrated && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
  })

  const accounts = data ?? []
  // Snapshot indexed onboarding before live lens hydration mutates the market
  // objects. Keep the snapshot stable between catalogue refreshes.
  const indexedOnboardingByMarket = useMemo(() => {
    const map: MarketOnboardingByAddress = {}
    const source = data ?? []
    source.forEach(({ market }) => {
      const mode = getSubgraphMarketOnboardingMode(market)
      if (mode) map[market.address.toLowerCase()] = mode
    })
    return map
  }, [catalogUpdatedAt, data])

  async function getLenderUpdates() {
    logger.debug(`Getting lender updates...`)
    // Refresh both time-sensitive market state and wallet-specific lender state.
    // `lender` remains undefined when disconnected so the SDK retains access
    // state while zeroing wallet balances and allowances.
    await refreshLenderMarketAccounts(
      targetChainId,
      signerOrProvider as SignerOrProvider,
      lender,
      accounts,
    )
    return {
      // Updates mutate the SDK objects in place. Publish a fresh collection
      // so downstream memoized sorting and card derivation observe every refresh.
      marketAccounts: [...accounts],
      onboardingByMarket: indexedOnboardingByMarket,
      queryIdentity: updateQueryIdentity,
    }
  }

  const {
    data: updates,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.UPDATE(
      targetChainId,
      lender,
      catalogUpdatedAt,
    ),
    queryFn: getLenderUpdates,
    enabled:
      isSelectedNetworkRehydrated &&
      !!data &&
      !!signerOrProvider &&
      !isWrongNetwork,
    refetchOnMount: false,
    refetchInterval: MARKET_LIVE_REFRESH_INTERVAL,
    staleTime: MARKET_LIVE_REFRESH_INTERVAL,
    // Keep the last enriched catalogue visible only while refreshing the same
    // chain and lender. Never expose another chain/account's personalized data.
    placeholderData: (previous) =>
      previous?.queryIdentity === updateQueryIdentity ? previous : undefined,
    gcTime: MARKET_LIVE_REFRESH_INTERVAL,
    structuralSharing: false,
  })

  let onboardingStatus: LenderMarketsOnboardingStatus = "loading"
  if (isErrorUpdate) onboardingStatus = "error"
  else if (updates) onboardingStatus = "ready"

  // Onboarding classification remains subgraph-derived even though the market
  // objects are subsequently hydrated with live lens state.
  const onboardingByMarket =
    updates?.onboardingByMarket ?? indexedOnboardingByMarket

  return {
    data: updates?.marketAccounts ?? accounts,
    onboardingByMarket,
    onboardingStatus,
    isLoadingInitial: !isSelectedNetworkRehydrated || isLoadingInitial,
    isErrorInitial,
    errorInitial: errorInitial as Error | null,
    refetchInitial,
    isLoadingUpdate,
    isPendingUpdate,
    isErrorUpdate,
    errorUpdate: errorUpdate as Error | null,
    refetchUpdate,
  }
}
