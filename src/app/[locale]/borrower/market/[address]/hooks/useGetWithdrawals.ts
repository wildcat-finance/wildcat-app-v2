import { useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLensContract,
  WithdrawalBatch,
  TwoStepQueryHookResult,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import {
  GetIncompleteWithdrawalsForMarketDocument,
  SubgraphGetIncompleteWithdrawalsForMarketQuery,
  SubgraphGetIncompleteWithdrawalsForMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"

export type BorrowerWithdrawalsForMarketResult = {
  activeWithdrawal: WithdrawalBatch | undefined
  expiredPendingWithdrawals: WithdrawalBatch[]
  batchesWithClaimableWithdrawals: WithdrawalBatch[]
  expiredWithdrawalsTotalOwed: TokenAmount
  activeWithdrawalsTotalOwed: TokenAmount
  claimableWithdrawalsAmount: TokenAmount
  incompleteBatches: WithdrawalBatch[]
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

export const GET_WITHDRAWALS_KEY = "get_market_withdrawals"

export function useGetWithdrawals(
  market: Market | undefined,
): TwoStepQueryHookResult<BorrowerWithdrawalsForMarketResult> {
  const address = market?.address.toLowerCase()
  async function getAllPendingWithdrawalBatches(): Promise<BorrowerWithdrawalsForMarketResult> {
    if (!address || !market) throw Error()
    logger.debug(`Getting withdrawal batches...`)
    const result = await SubgraphClient.query<
      SubgraphGetIncompleteWithdrawalsForMarketQuery,
      SubgraphGetIncompleteWithdrawalsForMarketQueryVariables
    >({
      query: GetIncompleteWithdrawalsForMarketDocument,
      variables: { market: address },
    })
    logger.debug(
      `Got withdrawal batches: ${result.data.market?.withdrawalBatches.length}`,
    )
    const incompleteBatches =
      result.data.market?.withdrawalBatches.map((batch) =>
        WithdrawalBatch.fromSubgraphWithdrawalBatch(market, batch),
      ) ?? []

    incompleteBatches.forEach((batch) => {
      if (batch.requests.length)
        batch.withdrawals.forEach((withdrawal) => {
          if (!withdrawal.requests.length) {
            withdrawal.requests = batch.requests.filter(
              (request) => request.address === withdrawal.lender,
            )
          }
        })
    })

    return processIncompleteWithdrawals(market, incompleteBatches)
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
    placeholderData: keepPreviousData,
    enabled: !!market,
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
    if (!address || !market) throw Error()
    logger.debug(`Getting batch updates...`)
    const lens = getLensContract(TargetChainId, market.provider)
    const batchUpdates = await lens.getWithdrawalBatchesData(
      address,
      withdrawals.incompleteBatches.map((x) => x.expiry),
    )
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < withdrawals.incompleteBatches.length; i++) {
      const batch = withdrawals.incompleteBatches[i]
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
    logger.debug(
      `Got withdrawal batch updates: ${withdrawals.incompleteBatches.length}`,
    )
    const expiredWithdrawalsTotalOwed = (
      withdrawals.expiredPendingWithdrawals as WithdrawalBatch[]
    ).reduce(
      (acc, batch) => acc.add(batch.normalizedAmountOwed),
      market.underlyingToken.getAmount(0),
    )
    const activeWithdrawalsTotalOwed =
      withdrawals.activeWithdrawal?.normalizedTotalAmount ??
      market.underlyingToken.getAmount(0)

    const batchesWithClaimableWithdrawals =
      withdrawals.incompleteBatches.filter(
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
      ...withdrawals,
      expiredWithdrawalsTotalOwed,
      activeWithdrawalsTotalOwed,
      batchesWithClaimableWithdrawals,
      claimableWithdrawalsAmount,
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
    placeholderData: keepPreviousData,
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
