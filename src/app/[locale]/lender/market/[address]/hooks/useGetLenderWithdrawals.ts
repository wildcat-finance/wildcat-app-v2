/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLatestLensContract,
  LenderWithdrawalStatus,
  TokenAmount,
  BatchStatus,
  getSubgraphClient,
  getIncompleteLenderWithdrawalsForMarket,
  logger,
} from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { cloneSdkObject } from "@/lib/sdk-object"
import { TwoStepQueryHookResult } from "@/utils/types"
import { applyLatestLensWithdrawalBatchUpdate } from "@/utils/withdrawalBatch"

export type LenderWithdrawalsForMarketResult = {
  expiredPendingWithdrawals: LenderWithdrawalStatus[]
  activeWithdrawal: LenderWithdrawalStatus | undefined
  expiredTotalPendingAmount: TokenAmount
  activeTotalPendingAmount: TokenAmount
  totalClaimableAmount: TokenAmount
}

const cloneWithdrawalStatus = (
  withdrawal: LenderWithdrawalStatus,
): LenderWithdrawalStatus => {
  const nextBatch = cloneSdkObject(withdrawal.batch)
  const nextWithdrawal = cloneSdkObject(withdrawal)
  nextWithdrawal.batch = nextBatch
  return nextWithdrawal
}

export const summarizeIncompleteLenderWithdrawals = (
  market: Market,
  withdrawals: LenderWithdrawalStatus[],
): LenderWithdrawalsForMarketResult => {
  const stillIncomplete = withdrawals.filter(
    (withdrawal) =>
      withdrawal.effectiveStatus !== BatchStatus.Complete ||
      !withdrawal.isCompleted,
  )

  // isConcluded handles both normal expiry AND market termination
  const activeWithdrawal = stillIncomplete.find(
    (withdrawal) => !withdrawal.isConcluded,
  )
  const expiredPendingWithdrawals = stillIncomplete.filter(
    (withdrawal) => withdrawal.isConcluded,
  )

  const zeroAmount = market.underlyingToken.getAmount(0)
  const activeTotalPendingAmount = activeWithdrawal
    ? activeWithdrawal.requests.reduce(
        (total, request) => total.add(request.normalizedAmount),
        zeroAmount,
      )
    : zeroAmount
  const expiredTotalPendingAmount = expiredPendingWithdrawals.reduce(
    (total, withdrawal) => total.add(withdrawal.normalizedUnpaidAmount),
    zeroAmount,
  )
  const totalClaimableAmount = expiredPendingWithdrawals.reduce(
    (total, withdrawal) => total.add(withdrawal.availableWithdrawalAmount),
    zeroAmount,
  )

  return {
    activeWithdrawal,
    expiredPendingWithdrawals,
    activeTotalPendingAmount,
    expiredTotalPendingAmount,
    totalClaimableAmount,
  }
}

export function useGetLenderWithdrawals(
  market: Market | undefined,
): TwoStepQueryHookResult<LenderWithdrawalsForMarketResult> {
  const { address } = useAccount()

  const targetChainId = market?.chainId
  const subgraphClient = useMemo(
    () => (targetChainId ? getSubgraphClient(targetChainId) : undefined),
    [targetChainId],
  )

  const lender = address?.toLowerCase()
  const marketAddress = market?.address.toLowerCase()
  async function queryLenderWithdrawals() {
    if (!lender || !market || !marketAddress || !subgraphClient) throw Error()
    logger.debug(`Getting lender withdrawals...`)
    const incompleteWithdrawals = await getIncompleteLenderWithdrawalsForMarket(
      subgraphClient,
      {
        market,
        lender,
        fetchPolicy: "network-only",
      },
    )
    logger.debug(
      `Got ${incompleteWithdrawals.length} incomplete withdrawals...`,
    )

    return summarizeIncompleteLenderWithdrawals(market, incompleteWithdrawals)
  }

  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_WITHDRAWALS.INITIAL(
      targetChainId ?? 0,
      lender,
      marketAddress,
    ),
    queryFn: queryLenderWithdrawals,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
    enabled: !!lender && !!market && !!targetChainId && !!subgraphClient,
    // refetchOnMount: false,
  })

  const withdrawals = useMemo(() => {
    if (data) return data
    return {
      expiredPendingWithdrawals: [],
      activeWithdrawal: undefined,
      expiredTotalPendingAmount: market?.underlyingToken.getAmount(0),
      activeTotalPendingAmount: market?.underlyingToken.getAmount(0),
      totalClaimableAmount: market?.underlyingToken.getAmount(0),
    }
  }, [data, market])

  async function updateWithdrawals() {
    logger.debug(`Updating withdrawals...`)
    if (!lender || !market || !marketAddress) throw Error()
    const lens = getLatestLensContract(market.chainId, market.provider)
    const incompleteWithdrawals = [
      ...(withdrawals.activeWithdrawal
        ? [cloneWithdrawalStatus(withdrawals.activeWithdrawal)]
        : []),
      ...(withdrawals.expiredPendingWithdrawals ?? []).map(
        cloneWithdrawalStatus,
      ),
    ]
    const withdrawalUpdates =
      await lens.getWithdrawalBatchesDataWithLenderStatus(
        marketAddress,
        incompleteWithdrawals.map((withdrawal) => withdrawal.expiry),
        lender,
      )
    let i = 0
    for (const withdrawal of incompleteWithdrawals) {
      const update = withdrawalUpdates[i++]
      applyLatestLensWithdrawalBatchUpdate(
        withdrawal.batch,
        update.batch,
        market.chainId,
      )
      withdrawal.updateWith(update.lenderStatus)
    }
    logger.debug(
      `Updated ${incompleteWithdrawals.length} incomplete withdrawals...`,
    )
    logger.debug(
      `Incomplete withdrawals after update: ${incompleteWithdrawals
        .map(
          (w) =>
            `expiry=${w.expiry}, available=${w.availableWithdrawalAmount.format(
              2,
              true,
            )}`,
        )
        .join(", ")}`,
    )

    // Re-categorize after the lens update; a batch may have just completed.
    return summarizeIncompleteLenderWithdrawals(market, incompleteWithdrawals)
  }

  const updateQueryKeys = useMemo(
    () => [
      ...(withdrawals.activeWithdrawal
        ? [withdrawals.activeWithdrawal.expiry]
        : []),
      ...(withdrawals.expiredPendingWithdrawals?.map((b) => b.expiry) ?? []),
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
    queryKey: QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
      targetChainId ?? 0,
      lender,
      marketAddress,
      updateQueryKeys,
    ),
    queryFn: updateWithdrawals,
    placeholderData: keepPreviousData,
    refetchInterval: POLLING_INTERVAL,
    enabled: !!data && updateQueryKeys.length > 0,
    // refetchOnMount: false,
  })

  const liveWithdrawals =
    updateQueryKeys.length > 0 ? updatedWithdrawals : undefined

  return {
    data: (liveWithdrawals ?? withdrawals) as LenderWithdrawalsForMarketResult,
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
