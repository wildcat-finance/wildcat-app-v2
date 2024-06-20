import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  Market,
  getLensContract,
  WithdrawalBatch,
  TwoStepQueryHookResult,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import {
  GetAllPendingWithdrawalBatchesForMarketDocument,
  SubgraphGetAllPendingWithdrawalBatchesForMarketQuery,
  SubgraphGetAllPendingWithdrawalBatchesForMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"

export type BorrowerWithdrawalsForMarketResult = {
  activeWithdrawal: WithdrawalBatch | undefined
  expiredPendingWithdrawals: WithdrawalBatch[]
  expiredWithdrawalsTotalOwed: TokenAmount
  activeWithdrawalsTotalOwed: TokenAmount
}
export const GET_WITHDRAWALS_KEY = "get_market_withdrawals"

export function useGetWithdrawals(
  market: Market | undefined,
): TwoStepQueryHookResult<BorrowerWithdrawalsForMarketResult> {
  const address = market?.address.toLowerCase()
  async function getAllPendingWithdrawalBatches() {
    if (!address || !market) throw Error()
    logger.debug(`Getting withdrawal batches...`)
    const result = await SubgraphClient.query<
      SubgraphGetAllPendingWithdrawalBatchesForMarketQuery,
      SubgraphGetAllPendingWithdrawalBatchesForMarketQueryVariables
    >({
      query: GetAllPendingWithdrawalBatchesForMarketDocument,
      variables: { market: address },
    })
    logger.debug(
      `Got withdrawal batches: ${result.data.market?.withdrawalBatches.length}`,
    )
    const withdrawalBatches =
      result.data.market?.withdrawalBatches.map((batch) =>
        WithdrawalBatch.fromSubgraphWithdrawalBatch(market, batch),
      ) ?? []
    const activeWithdrawal = withdrawalBatches.find(
      (batch) => batch.expiry === market.pendingWithdrawalExpiry,
    )
    const expiredPendingWithdrawals = withdrawalBatches.filter(
      (batch) => batch.expiry !== market.pendingWithdrawalExpiry,
    )
    const expiredWithdrawalsTotalOwed = expiredPendingWithdrawals.reduce(
      (acc, batch) => acc.add(batch.normalizedAmountOwed),
      market.underlyingToken.getAmount(0),
    )
    const activeWithdrawalsTotalOwed =
      activeWithdrawal?.normalizedTotalAmount ??
      market.underlyingToken.getAmount(0)

    return {
      activeWithdrawal,
      expiredPendingWithdrawals,
      expiredWithdrawalsTotalOwed,
      activeWithdrawalsTotalOwed,
    }
  }
  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
  } = useQuery({
    queryKey: [GET_WITHDRAWALS_KEY, "initial", address],
    queryFn: getAllPendingWithdrawalBatches,
    refetchInterval: POLLING_INTERVAL,
    // keepPreviousData: true,
    enabled: !!market,
    refetchOnMount: false,
  })

  const withdrawals = data ?? {
    activeWithdrawal: undefined,
    expiredPendingWithdrawals: [],
    expiredWithdrawalsTotalOwed: market?.underlyingToken.getAmount(0),
    activeWithdrawalsTotalOwed: market?.underlyingToken.getAmount(0),
  }
  async function getUpdatedBatches() {
    if (!address || !market) throw Error()
    logger.debug(`Getting batch updates...`)
    const lens = getLensContract(TargetChainId, market.provider)
    const pendingWithdrawals = [
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...(withdrawals.expiredPendingWithdrawals ?? []),
    ]
    const batchUpdates = await lens.getWithdrawalBatchesData(
      address,
      pendingWithdrawals.map((x) => x.expiry),
    )
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < pendingWithdrawals.length; i++) {
      const batch = pendingWithdrawals[i]
      const update = batchUpdates[i]
      logger.debug(
        `Batch last update: ${batch.lastUpdatedTimestamp} | Market last update: ${market.lastInterestAccruedTimestamp}`,
      )
      logger.debug(
        `Previous batch total value: ${batch.normalizedTotalAmount.format(
          18,
          true,
        )}`,
      )
      logger.debug(
        `Previous batch interest: ${batch.totalInterestEarned?.format(
          18,
          true,
        )}`,
      )
      batch.applyLensUpdate(update)
      logger.debug(
        `New batch total value: ${batch.normalizedTotalAmount.format(
          18,
          true,
        )}`,
      )
      logger.debug(
        `New batch interest: ${batch.totalInterestEarned?.format(18, true)}`,
      )
    }
    logger.debug(`Got withdrawal batch updates: ${pendingWithdrawals.length}`)
    const expiredWithdrawalsTotalOwed = (
      withdrawals.expiredPendingWithdrawals as WithdrawalBatch[]
    ).reduce(
      (acc, batch) => acc.add(batch.normalizedAmountOwed),
      market.underlyingToken.getAmount(0),
    )
    const activeWithdrawalsTotalOwed =
      withdrawals.activeWithdrawal?.normalizedTotalAmount ??
      market.underlyingToken.getAmount(0)

    return {
      activeWithdrawal: withdrawals.activeWithdrawal,
      expiredPendingWithdrawals: withdrawals.expiredPendingWithdrawals,
      expiredWithdrawalsTotalOwed,
      activeWithdrawalsTotalOwed,
    }
  }

  const updateQueryKeys = useMemo(
    () => [
      ...(withdrawals.activeWithdrawal
        ? [withdrawals.activeWithdrawal.expiry]
        : []),
      ...(withdrawals.expiredPendingWithdrawals?.map((b) => [b.expiry]) ?? []),
    ],
    [withdrawals],
  )

  const {
    data: updatedWithdrawals,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: [GET_WITHDRAWALS_KEY, "update", updateQueryKeys],
    queryFn: getUpdatedBatches,
    // keepPreviousData: true,
    enabled: !!data,
    refetchOnMount: false,
  })

  return {
    data: (updatedWithdrawals ??
      withdrawals) as BorrowerWithdrawalsForMarketResult,
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
