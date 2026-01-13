/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLensV2Contract,
  WithdrawalBatch,
  LenderWithdrawalStatus,
  TokenAmount,
  BatchStatus,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import {
  GetLenderWithdrawalsForMarketDocument,
  SubgraphGetLenderWithdrawalsForMarketQuery,
  SubgraphGetLenderWithdrawalsForMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"
import { useAccount } from "wagmi"

import { POLLING_INTERVALS } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { TwoStepQueryHookResult } from "@/utils/types"

export type LenderWithdrawalsForMarketResult = {
  completeWithdrawals: LenderWithdrawalStatus[]
  expiredPendingWithdrawals: LenderWithdrawalStatus[]
  activeWithdrawal: LenderWithdrawalStatus | undefined
  expiredTotalPendingAmount: TokenAmount
  activeTotalPendingAmount: TokenAmount
  totalClaimableAmount: TokenAmount
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
    const result = await subgraphClient.query<
      SubgraphGetLenderWithdrawalsForMarketQuery,
      SubgraphGetLenderWithdrawalsForMarketQueryVariables
    >({
      query: GetLenderWithdrawalsForMarketDocument,
      variables: { market: marketAddress, lender },
    })
    const lenderData = result.data.market?.lenders[0]
    const completeWithdrawals =
      lenderData?.completeWithdrawals.map((data) => {
        const batch = WithdrawalBatch.fromSubgraphWithdrawalBatch(
          market,
          data.batch,
        )
        return LenderWithdrawalStatus.fromSubgraphLenderWithdrawalStatus(
          market,
          batch,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data as any,
          lender,
        )
      }) ?? []
    const incompleteWithdrawals =
      lenderData?.incompleteWithdrawals.map((data) => {
        const batch = WithdrawalBatch.fromSubgraphWithdrawalBatch(
          market,
          data.batch,
        )
        return LenderWithdrawalStatus.fromSubgraphLenderWithdrawalStatus(
          market,
          batch,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data as any,
          lender,
        )
      }) ?? []
    logger.debug(`Got ${completeWithdrawals.length} complete withdrawals...`)
    logger.debug(
      `Got ${incompleteWithdrawals.length} incomplete withdrawals...`,
    )

    // isConcluded handles both normal expiry AND market termination
    const activeWithdrawal = incompleteWithdrawals.find((w) => !w.isConcluded)
    const expiredPendingWithdrawals = incompleteWithdrawals.filter(
      (w) => w.isConcluded,
    )

    const zeroAmount = market.underlyingToken.getAmount(0)
    const activeTotalPendingAmount = activeWithdrawal
      ? activeWithdrawal.requests.reduce(
          (acc, r) => acc.add(r.normalizedAmount),
          zeroAmount,
        )
      : zeroAmount
    const expiredTotalPendingAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.normalizedUnpaidAmount),
      zeroAmount,
    )
    const totalClaimableAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.availableWithdrawalAmount),
      zeroAmount,
    )

    return {
      activeWithdrawal,
      completeWithdrawals,
      expiredPendingWithdrawals,
      activeTotalPendingAmount,
      expiredTotalPendingAmount,
      totalClaimableAmount,
    }
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
    refetchInterval: POLLING_INTERVALS.default,
    placeholderData: keepPreviousData,
    enabled: !!lender && !!market && !!targetChainId && !!subgraphClient,
    // refetchOnMount: false,
  })

  const withdrawals = useMemo(() => {
    if (data) return data
    return {
      completeWithdrawals: [],
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
    const lens = getLensV2Contract(market.chainId, market.provider)
    const incompleteWithdrawals = [
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...(withdrawals.expiredPendingWithdrawals ?? []),
    ]
    const withdrawalUpdates =
      await lens.getWithdrawalBatchesDataWithLenderStatus(
        marketAddress,
        [...withdrawals.completeWithdrawals, ...incompleteWithdrawals].map(
          (w) => w.expiry,
        ),
        lender,
      )
    let i = 0
    for (const withdrawal of withdrawals.completeWithdrawals) {
      const update = withdrawalUpdates[i++]
      withdrawal.batch.applyLensUpdate(update.batch)
      withdrawal.updateWith(update.lenderStatus)
    }
    for (const withdrawal of incompleteWithdrawals) {
      const update = withdrawalUpdates[i++]
      withdrawal.batch.applyLensUpdate(update.batch)
      withdrawal.updateWith(update.lenderStatus)
    }
    logger.debug(
      `Updated ${withdrawals.completeWithdrawals.length} complete withdrawals...`,
    )
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

    // Re-categorize after lens update — status may have changed
    const allWithdrawals = [
      ...incompleteWithdrawals,
      ...(withdrawals.completeWithdrawals ?? []),
    ]

    const completeWithdrawals: LenderWithdrawalStatus[] = []
    const stillIncomplete: LenderWithdrawalStatus[] = []
    for (const wd of allWithdrawals) {
      if (wd.effectiveStatus === BatchStatus.Complete && wd.isCompleted) {
        completeWithdrawals.push(wd)
      } else {
        stillIncomplete.push(wd)
      }
    }

    const activeWithdrawal = stillIncomplete.find((w) => !w.isConcluded)
    const expiredPendingWithdrawals = stillIncomplete.filter(
      (w) => w.isConcluded,
    )

    const zeroAmount = market.underlyingToken.getAmount(0)
    const activeTotalPendingAmount = activeWithdrawal
      ? activeWithdrawal.requests.reduce(
          (acc, r) => acc.add(r.normalizedAmount),
          zeroAmount,
        )
      : zeroAmount
    const expiredTotalPendingAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.normalizedUnpaidAmount),
      zeroAmount,
    )
    const totalClaimableAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.availableWithdrawalAmount),
      zeroAmount,
    )

    return {
      activeWithdrawal,
      completeWithdrawals,
      expiredPendingWithdrawals,
      activeTotalPendingAmount,
      expiredTotalPendingAmount,
      totalClaimableAmount,
    }
  }

  const updateQueryKeys = useMemo(
    () => [
      ...withdrawals.completeWithdrawals.map((b) => [b.expiry]),
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
    queryKey: QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
      targetChainId ?? 0,
      lender,
      marketAddress,
      updateQueryKeys,
    ),
    queryFn: updateWithdrawals,
    placeholderData: keepPreviousData,
    enabled: !!data,
    // refetchOnMount: false,
  })

  return {
    data: (updatedWithdrawals ??
      withdrawals) as LenderWithdrawalsForMarketResult,
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
