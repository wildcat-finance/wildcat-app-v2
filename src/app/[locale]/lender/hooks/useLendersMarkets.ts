/* eslint-disable camelcase */
import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  Market,
  MarketAccount,
  getLensContract,
  MarketVersion,
  SupportedChainId,
  getLensV2Contract,
  SubgraphGetAllMarketsForLenderViewQueryVariables,
  getLenderAccountsForAllMarkets,
  SubgraphMarket_Filter,
  hasDeploymentAddress,
} from "@wildcatfi/wildcat-sdk"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"
import { BigNumber, constants } from "ethers"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useIsSelectedNetworkRehydrated } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { EXCLUDED_MARKETS_FILTER, TOKENS_ADDRESSES } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"
import {
  getV2MarketOnboardingMode,
  MarketOnboardingByAddress,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { isFrontendVisibleMarket } from "@/utils/marketType"
import { TwoStepQueryHookResult } from "@/utils/types"

export type LenderMarketsQueryProps =
  SubgraphGetAllMarketsForLenderViewQueryVariables

type LenderMarketUpdates = {
  marketAccounts: MarketAccount[]
  onboardingByMarket: MarketOnboardingByAddress
  queryIdentity: string
}

export type LenderMarketsOnboardingStatus = "loading" | "ready" | "error"

const MARKET_CATALOG_POLLING_INTERVAL = 60_000

export type LenderMarketsResult = TwoStepQueryHookResult<
  MarketAccount[],
  LenderMarketUpdates
> & {
  hasMarketUpdates: boolean
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
}

function getChunks<T extends Market | MarketAccount>(
  chainId: SupportedChainId,
  values: T[],
): { v1Chunks: T[][]; v2Chunks: T[][] } {
  const v1Values = values.filter(
    (v) =>
      (v instanceof Market ? v.version : v.market.version) === MarketVersion.V1,
  )
  const v2Values = values.filter(
    (v) =>
      (v instanceof Market ? v.version : v.market.version) === MarketVersion.V2,
  )
  const isWeth = (v: T): boolean =>
    (v instanceof Market
      ? v.underlyingToken
      : v.market.underlyingToken
    ).address.toLowerCase() === TOKENS_ADDRESSES.WETH
  if (chainId === SupportedChainId.Mainnet) {
    const v1Chunks = [
      ...v1Values.filter(isWeth).map((m) => [m]),
      v1Values.filter((v) => !isWeth(v)),
    ]
    const v2Chunks = [
      ...v2Values.filter(isWeth).map((m) => [m]),
      v2Values.filter((v) => !isWeth(v)),
    ]
    return { v1Chunks, v2Chunks }
  }
  return {
    v1Chunks: [v1Values],
    v2Chunks: [v2Values],
  }
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
    const lenderAccounts = await getLenderAccountsForAllMarkets(
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
    enabled:
      isSelectedNetworkRehydrated && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
  })

  const accounts = data ?? []

  async function getLenderUpdates() {
    logger.debug(`Getting lender updates...`)
    const hasV1Lens = hasDeploymentAddress(targetChainId, "MarketLens")
    const lens = hasV1Lens
      ? getLensContract(targetChainId, signerOrProvider as SignerOrProvider)
      : undefined
    const lensV2 = getLensV2Contract(
      targetChainId,
      signerOrProvider as SignerOrProvider,
    )

    const { v1Chunks, v2Chunks } = getChunks(targetChainId, accounts)
    const onboardingByMarket: MarketOnboardingByAddress = Object.fromEntries(
      accounts
        .filter((account) => account.market.version === MarketVersion.V1)
        .map((account) => [
          account.market.address.toLowerCase(),
          MarketOnboardingMode.BorrowerApproval,
        ]),
    )
    await Promise.all([
      ...(lens
        ? v1Chunks.map(async (accountsChunk) => {
            const updates = await lens.getMarketsDataWithLenderStatus(
              lender ?? constants.AddressZero,
              accountsChunk.map((m) => m.market.address),
            )
            accountsChunk.forEach((account, i) => {
              let update = updates[i]
              account.market.updateWith(update.market)
              // If the lender account is not set, set the balances to 0 but still use
              // the credential, as that will tell us whether the market is open access.
              if (!lender) {
                update = {
                  ...update,
                  lenderStatus: {
                    ...update.lenderStatus,
                    normalizedBalance: BigNumber.from(0),
                    scaledBalance: BigNumber.from(0),
                    underlyingBalance: BigNumber.from(0),
                    underlyingApproval: BigNumber.from(0),
                  },
                }
              }
              account.updateWith(update.lenderStatus)
            })
          })
        : []),
      ...v2Chunks.map(async (accountsChunk) => {
        const updates = await lensV2.getMarketsDataWithLenderStatus(
          lender ?? constants.AddressZero,
          accountsChunk.map((m) => m.market.address),
        )
        accountsChunk.forEach((account, i) => {
          let update = updates[i]
          onboardingByMarket[account.market.address.toLowerCase()] =
            getV2MarketOnboardingMode(update.market)
          account.market.updateWith(update.market)
          // If the lender account is not set, set the balances to 0 but still use
          // the credential, as that will tell us whether the market is open access.
          if (!lender) {
            update = {
              ...update,
              lenderStatus: {
                ...update.lenderStatus,
                normalizedBalance: BigNumber.from(0),
                scaledBalance: BigNumber.from(0),
                underlyingBalance: BigNumber.from(0),
                underlyingApproval: BigNumber.from(0),
              },
            }
          }
          account.updateWith(update.lenderStatus)
        })
      }),
    ]).catch((e) => {
      console.log(e)
      throw e
    })
    console.log(`getLenderUpdates:: Got lender updates: ${accounts.length}`)
    return {
      // Lens updates mutate the SDK objects in place. Publish a fresh collection
      // so downstream memoized sorting and card derivation observe every refresh.
      marketAccounts: [...accounts],
      onboardingByMarket,
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
    refetchInterval: POLLING_INTERVAL,
    // Keep the last enriched catalogue visible only while refreshing the same
    // chain and lender. Never expose another chain/account's personalized data.
    placeholderData: (previous) =>
      previous?.queryIdentity === updateQueryIdentity ? previous : undefined,
    gcTime: MARKET_CATALOG_POLLING_INTERVAL,
    structuralSharing: false,
  })

  let onboardingStatus: LenderMarketsOnboardingStatus = "loading"
  if (isErrorUpdate) onboardingStatus = "error"
  else if (updates) onboardingStatus = "ready"

  return {
    data: updates?.marketAccounts ?? accounts,
    hasMarketUpdates: !!updates,
    onboardingByMarket: updates?.onboardingByMarket ?? {},
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
