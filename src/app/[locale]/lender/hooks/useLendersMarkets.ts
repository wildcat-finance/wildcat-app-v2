import { useMemo, useRef } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  SignerOrProvider,
  Market,
  MarketAccount,
  getLensContract,
  MarketVersion,
  SupportedChainId,
  getLenderAccountsForAllMarkets,
  hasDeploymentAddress,
  logger,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { cloneSdkObject } from "@/lib/sdk-object"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { TOKENS_ADDRESSES } from "@/utils/constants"
import { isNotExcludedMarket } from "@/utils/filters"
import {
  getSubgraphMarketOnboardingMode,
  MarketOnboardingByAddress,
} from "@/utils/marketOnboarding"
import { refreshMarketAccountsV2LiveDataSafe } from "@/utils/marketV2Reads"
import { TwoStepQueryHookResult } from "@/utils/types"

export const LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL = 60_000
export const LENDER_DASHBOARD_LIVE_REFRESH_INTERVAL = 60_000

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

type LenderStatusUpdate = Parameters<MarketAccount["updateWith"]>[0]

export type LenderMarketsOnboardingStatus = "loading" | "ready" | "error"

type UseLendersMarketsResult = TwoStepQueryHookResult<MarketAccount[]> & {
  hasLiveData: boolean
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
}

function zeroLenderBalances(lenderStatus: LenderStatusUpdate) {
  const zero = BigInt(0)
  return {
    ...lenderStatus,
    normalizedBalance: zero,
    scaledBalance: zero,
    underlyingBalance: zero,
    underlyingApproval: zero,
  } as unknown as LenderStatusUpdate
}

export function cloneMarketAccountForLiveRefresh(
  account: MarketAccount,
  signerOrProvider: SignerOrProvider,
) {
  const market = cloneSdkObject(account.market)

  // ContractWrapper.provider propagates to nested wrappers. Clone the tokens
  // before changing providers so the indexed React Query entry stays immutable.
  market.marketToken = cloneSdkObject(account.market.marketToken)
  market.underlyingToken = cloneSdkObject(account.market.underlyingToken)
  market.provider = signerOrProvider

  const accountForLiveRefresh = cloneSdkObject(account)
  accountForLiveRefresh.market = market
  return accountForLiveRefresh
}

export function useLendersMarkets(): UseLendersMarketsResult {
  const { isWrongNetwork, provider, signer, address } = useEthersProvider()
  const { chainId, targetChainId } = useCurrentNetwork()
  const subgraphClient = useSubgraphClient()
  const signerOrProvider = signer ?? provider

  const lender = address?.toLowerCase()

  async function queryMarketsForLender() {
    logger.debug(`Getting all markets...`)
    if (!chainId) throw Error("No chainId")
    if (!signerOrProvider) throw Error(`no provider`)
    const lenderAccounts = await getLenderAccountsForAllMarkets(
      subgraphClient,
      {
        lender: lender ?? zeroAddress,
        fetchPolicy: "network-only",
        chainId,
        signerOrProvider,
      },
    )
    return lenderAccounts
      .filter((account) => isNotExcludedMarket(account.market))
      .sort(
        (a, b) =>
          (b.market.deployedEvent?.blockNumber ?? 0) -
          (a.market.deployedEvent?.blockNumber ?? 0),
      )
  }

  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
    dataUpdatedAt: indexedDataUpdatedAt,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.INITIAL(
      targetChainId,
      lender,
    ),
    queryFn: queryMarketsForLender,
    refetchInterval: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    staleTime: LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL,
    enabled: !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  })

  const accounts = data ?? []
  const onboardingByMarket = useMemo(() => {
    const result: MarketOnboardingByAddress = {}
    accounts.forEach(({ market }) => {
      const onboardingMode = getSubgraphMarketOnboardingMode(market)
      if (onboardingMode) {
        result[market.address.toLowerCase()] = onboardingMode
      }
    })
    return result
  }, [accounts, indexedDataUpdatedAt])

  async function getLenderUpdates() {
    logger.debug(`Getting lender updates...`)
    if (!signerOrProvider) throw Error(`no provider`)

    const accountsForLiveRefresh = accounts.map((account) =>
      cloneMarketAccountForLiveRefresh(account, signerOrProvider),
    )
    const hasV1Lens = hasDeploymentAddress(targetChainId, "MarketLens")
    const lens = hasV1Lens
      ? getLensContract(targetChainId, signerOrProvider as SignerOrProvider)
      : undefined

    const { v1Chunks, v2Chunks } = getChunks(
      targetChainId,
      accountsForLiveRefresh,
    )
    await Promise.all([
      ...(lens
        ? v1Chunks.map(async (accountsChunk) => {
            const updates = await lens.getMarketsDataWithLenderStatus(
              lender ?? zeroAddress,
              accountsChunk.map((m) => m.market.address),
            )
            accountsChunk.forEach((account, i) => {
              const update = updates[i]
              account.market.updateWith(update.market)
              // If the lender account is not set, set the balances to 0 but still use
              // the credential, as that will tell us whether the market is open access.
              account.updateWith(
                !lender
                  ? zeroLenderBalances(update.lenderStatus)
                  : update.lenderStatus,
              )
            })
          })
        : []),
      ...v2Chunks.map(async (accountsChunk) => {
        if (accountsChunk.length === 0) {
          return
        }
        await refreshMarketAccountsV2LiveDataSafe(
          targetChainId,
          signerOrProvider as SignerOrProvider,
          lender,
          accountsChunk,
        )
      }),
    ]).catch((e) => {
      throw e
    })
    logger.debug(`Got ${accountsForLiveRefresh.length} lender updates`)
    return accountsForLiveRefresh
  }

  const {
    data: updatedLenders,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_LENDER_ACCOUNTS.UPDATE(
      targetChainId,
      lender,
      indexedDataUpdatedAt,
    ),
    queryFn: getLenderUpdates,
    refetchInterval: LENDER_DASHBOARD_LIVE_REFRESH_INTERVAL,
    staleTime: LENDER_DASHBOARD_LIVE_REFRESH_INTERVAL,
    enabled: !!data && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  })

  const lastLiveSnapshot = useRef<{
    chainId: SupportedChainId
    lender: string | undefined
    accounts: MarketAccount[]
  }>()

  // An indexed refresh starts a new live query. Keep the last hydrated rows on
  // screen while it runs, but never carry them across a chain or wallet change.
  if (updatedLenders !== undefined) {
    lastLiveSnapshot.current = {
      chainId: targetChainId,
      lender,
      accounts: updatedLenders,
    }
  }

  const retainedLiveLenders =
    lastLiveSnapshot.current?.chainId === targetChainId &&
    lastLiveSnapshot.current.lender === lender
      ? lastLiveSnapshot.current.accounts
      : undefined
  const liveLenders = updatedLenders ?? retainedLiveLenders

  let onboardingStatus: LenderMarketsOnboardingStatus = "loading"
  if (isErrorInitial) onboardingStatus = "error"
  else if (data) onboardingStatus = "ready"

  return {
    data: liveLenders ?? accounts,
    hasLiveData: liveLenders !== undefined,
    onboardingByMarket,
    onboardingStatus,
    isLoadingInitial,
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
