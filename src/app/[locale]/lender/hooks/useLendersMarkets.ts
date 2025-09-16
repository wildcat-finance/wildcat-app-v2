/* eslint-disable camelcase */
import { useMemo } from "react"

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
} from "@wildcatfi/wildcat-sdk"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"
import { BigNumber, constants } from "ethers"

import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { EXCLUDED_MARKETS_FILTER, TOKENS_ADDRESSES } from "@/utils/constants"
import { combineFilters } from "@/utils/filters"
import { TwoStepQueryHookResult } from "@/utils/types"

export type LenderMarketsQueryProps =
  SubgraphGetAllMarketsForLenderViewQueryVariables

export const GET_LENDERS_ACCOUNTS_KEY = "lenders_accounts_list"

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
): TwoStepQueryHookResult<MarketAccount[]> {
  const { isWrongNetwork, provider, signer, address } = useEthersProvider()
  const { chainId, targetChainId } = useCurrentNetwork()
  const subgraphClient = useSubgraphClient()
  const signerOrProvider = signer ?? provider

  const lender = address?.toLowerCase()

  async function queryMarketsForLender() {
    logger.debug(`Getting all markets...`)
    if (!chainId) throw Error("No chainId")
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
        chainId,
        signerOrProvider,
        marketFilter: filter,
      },
    )
    lenderAccounts.sort(
      (a, b) =>
        (b.market.deployedEvent?.blockNumber ?? 0) -
        (a.market.deployedEvent?.blockNumber ?? 0),
    )
    return lenderAccounts
  }

  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
  } = useQuery({
    queryKey: [
      targetChainId,
      GET_LENDERS_ACCOUNTS_KEY,
      "initial",
      JSON.stringify(filters),
      lender,
    ],
    queryFn: queryMarketsForLender,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
  })

  const accounts = data ?? []

  const CHUNK_SIZE = targetChainId === 1 ? 5 : 50

  async function getLenderUpdates() {
    logger.debug(`Getting lender updates...`)
    const lens = getLensContract(
      targetChainId,
      signerOrProvider as SignerOrProvider,
    )
    const lensV2 = getLensV2Contract(
      targetChainId,
      signerOrProvider as SignerOrProvider,
    )

    const { v1Chunks, v2Chunks } = getChunks(targetChainId, accounts)
    await Promise.all([
      ...v1Chunks.map(async (accountsChunk) => {
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
      }),
      ...v2Chunks.map(async (accountsChunk) => {
        const updates = await lensV2.getMarketsDataWithLenderStatus(
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
      }),
    ]).catch((e) => {
      console.log(e)
      throw e
    })
    console.log(`getLenderUpdates:: Got lender updates: ${accounts.length}`)
    return accounts
  }

  const updateQueryKeys = useMemo(
    () => accounts.map((b) => [b.market.address, b.account]),
    [accounts],
  )

  const {
    data: updatedLenders,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: [targetChainId, GET_LENDERS_ACCOUNTS_KEY, "update", updateQueryKeys],
    queryFn: getLenderUpdates,
    enabled: !!data,
    refetchOnMount: false,
  })

  return {
    data: updatedLenders ?? accounts,
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
