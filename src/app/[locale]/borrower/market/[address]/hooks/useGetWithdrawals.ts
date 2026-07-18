import { useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLatestLensContract,
  WithdrawalBatch,
  TokenAmount,
  getSubgraphClient,
  getIncompleteWithdrawalsForMarket,
  logger,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { cloneSdkObject } from "@/lib/sdk-object"
import { TwoStepQueryHookResult } from "@/utils/types"
import { applyLatestLensWithdrawalBatchUpdate } from "@/utils/withdrawalBatch"

export type BorrowerWithdrawalsForMarketResult = {
  activeWithdrawal: WithdrawalBatch | undefined
  expiredPendingWithdrawals: WithdrawalBatch[]
  batchesWithClaimableWithdrawals: WithdrawalBatch[]
  expiredWithdrawalsTotalOwed: TokenAmount
  activeWithdrawalsTotalOwed: TokenAmount
  claimableWithdrawalsAmount: TokenAmount
  incompleteBatches: WithdrawalBatch[]
}

export const buildBorrowerWithdrawalUpdateQueryKeys = (
  withdrawals: BorrowerWithdrawalsForMarketResult | undefined,
) => {
  if (!withdrawals) return []

  const expiredBatches = withdrawals.expiredPendingWithdrawals ?? []

  return [
    ...(withdrawals.activeWithdrawal
      ? [withdrawals.activeWithdrawal.expiry]
      : []),
    ...expiredBatches.map((batch) => [batch.expiry]),
  ]
}

function processIncompleteWithdrawals(
  market: Market,
  incompleteBatches: WithdrawalBatch[],
) {
  const pendingBatches = incompleteBatches.filter((batch) => !batch.isClosed)
  const activeWithdrawal = pendingBatches.find(
    (batch) => batch.expiry === market.pendingWithdrawalExpiry,
  )
  const expiredPendingWithdrawals = pendingBatches.filter(
    (batch) => batch.expiry !== market.pendingWithdrawalExpiry,
  )
  const expiredWithdrawalsTotalOwed = expiredPendingWithdrawals.reduce(
    (acc, batch) => acc.add(batch.normalizedAmountOwed),
    market.underlyingToken.getAmount(0),
  )
  const activeWithdrawalsTotalOwed =
    activeWithdrawal?.normalizedTotalAmount ??
    market.underlyingToken.getAmount(0)
  const batchesWithClaimableWithdrawals = incompleteBatches.filter(
    (batch) =>
      batch.status > 1 &&
      batch.withdrawals.some((w) => w.availableWithdrawalAmount.gt(0)),
  )
  const claimableWithdrawalsAmount = batchesWithClaimableWithdrawals.reduce(
    (acc, batch) =>
      acc.add(
        batch.withdrawals.reduce(
          (sum, w) => sum.add(w.availableWithdrawalAmount),
          market.underlyingToken.getAmount(0),
        ),
      ),
    market.underlyingToken.getAmount(0),
  )
  return {
    activeWithdrawal,
    expiredPendingWithdrawals,
    expiredWithdrawalsTotalOwed,
    activeWithdrawalsTotalOwed,
    batchesWithClaimableWithdrawals,
    claimableWithdrawalsAmount,
    incompleteBatches,
  }
}

export function useGetWithdrawals(
  market: Market | undefined,
): TwoStepQueryHookResult<BorrowerWithdrawalsForMarketResult> {
  const address = market?.address.toLowerCase()
  const targetChainId = market?.chainId
  const subgraphClient = useMemo(
    () => (targetChainId ? getSubgraphClient(targetChainId) : undefined),
    [targetChainId],
  )
  async function getIncompleteWithdrawalBatches(): Promise<BorrowerWithdrawalsForMarketResult> {
    if (!address || !market || !subgraphClient) throw Error()
    logger.debug(`Getting withdrawal batches...`)
    const incompleteBatches = await getIncompleteWithdrawalsForMarket(
      subgraphClient,
      {
        market,
        fetchPolicy: "network-only",
      },
    )
    logger.debug(`Got withdrawal batches: ${incompleteBatches.length}`)

    return processIncompleteWithdrawals(market, incompleteBatches)
  }
  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
  } = useQuery({
    queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
      targetChainId ?? 0,
      "initial",
      address,
    ),
    queryFn: getIncompleteWithdrawalBatches,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
    enabled: !!market && !!targetChainId && !!subgraphClient,
    refetchOnMount: false,
  })

  const withdrawals =
    data ??
    ({
      activeWithdrawal: undefined,
      expiredPendingWithdrawals: [],
      expiredWithdrawalsTotalOwed: market?.underlyingToken.getAmount(0),
      activeWithdrawalsTotalOwed: market?.underlyingToken.getAmount(0),
      batchesWithClaimableWithdrawals: [],
      incompleteBatches: [],
      claimableWithdrawalsAmount: market?.underlyingToken.getAmount(0),
    } as BorrowerWithdrawalsForMarketResult)
  async function getUpdatedBatches(): Promise<BorrowerWithdrawalsForMarketResult> {
    if (!address || !market || !targetChainId) throw Error()
    logger.debug(`Getting batch updates...`)
    const lens = getLatestLensContract(targetChainId, market.provider)
    const incompleteBatches = withdrawals.incompleteBatches.map((batch) =>
      cloneSdkObject(batch),
    )
    const batchUpdates = await lens.getWithdrawalBatchesData(
      address,
      incompleteBatches.map((x) => x.expiry),
    )
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < incompleteBatches.length; i++) {
      const batch = incompleteBatches[i]
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
      applyLatestLensWithdrawalBatchUpdate(batch, update, targetChainId)
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
    logger.debug(`Got withdrawal batch updates: ${incompleteBatches.length}`)
    return processIncompleteWithdrawals(market, incompleteBatches)
  }

  const updateQueryKeys = useMemo(
    () => buildBorrowerWithdrawalUpdateQueryKeys(data),
    [data],
  )

  const {
    data: updatedWithdrawals,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: QueryKeys.Borrower.GET_WITHDRAWALS(
      targetChainId ?? 0,
      "update",
      address,
      updateQueryKeys,
    ),
    queryFn: getUpdatedBatches,
    placeholderData: keepPreviousData,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!data && !!targetChainId,
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
