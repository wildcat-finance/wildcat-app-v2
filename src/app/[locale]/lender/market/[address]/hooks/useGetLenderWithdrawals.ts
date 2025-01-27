/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLensContract,
  WithdrawalBatch,
  LenderWithdrawalStatus,
  TokenAmount,
  BatchStatus,
} from "@wildcatfi/wildcat-sdk"
import {
  GetLenderWithdrawalsForMarketDocument,
  SubgraphGetLenderWithdrawalsForMarketQuery,
  SubgraphGetLenderWithdrawalsForMarketQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { logger } from "@wildcatfi/wildcat-sdk/dist/utils/logger"
import { useAccount } from "wagmi"

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { TwoStepQueryHookResult } from "@/utils/types"

export type LenderWithdrawalsForMarketResult = {
  completeWithdrawals: LenderWithdrawalStatus[]
  expiredPendingWithdrawals: LenderWithdrawalStatus[]
  activeWithdrawal: LenderWithdrawalStatus | undefined
  expiredTotalPendingAmount: TokenAmount
  activeTotalPendingAmount: TokenAmount
  totalClaimableAmount: TokenAmount
}

export const GET_LENDER_WITHDRAWALS_KEY = "get_lender_withdrawals"

export function useGetLenderWithdrawals(
  market: Market | undefined,
): TwoStepQueryHookResult<LenderWithdrawalsForMarketResult> {
  const { address } = useAccount()
  const lender = address?.toLowerCase()
  const marketAddress = market?.address.toLowerCase()
  async function queryLenderWithdrawals() {
    if (!lender || !market || !marketAddress) throw Error()
    logger.debug(`Getting lender withdrawals...`)
    const result = await SubgraphClient.query<
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
    /*
    for (const withdrawal of incompleteWithdrawals) {
      console.log(
        `Withdrawal ${withdrawal.expiry} ${withdrawal.requests.length} requests`,
      )
    }
    */
    const activeWithdrawal = incompleteWithdrawals.find(
      (w) => w.status === BatchStatus.Pending,
    )

    // const activeTotalPendingAmount =
    //   activeWithdrawal?.normalizedUnpaidAmount ??
    //   market.underlyingToken.getAmount(0)

    // TODO: check with Dillon difference

    const activeTotalPendingAmount =
      activeWithdrawal?.normalizedTotalAmount ??
      market.underlyingToken.getAmount(0)

    const expiredPendingWithdrawals = incompleteWithdrawals.filter(
      (w) => w.status !== BatchStatus.Pending,
    )

    const expiredTotalPendingAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.normalizedUnpaidAmount),
      market.underlyingToken.getAmount(0),
    )
    const totalClaimableAmount = expiredPendingWithdrawals.reduce(
      (acc, w) => acc.add(w.availableWithdrawalAmount),
      market.underlyingToken.getAmount(0),
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
    queryKey: [GET_LENDER_WITHDRAWALS_KEY, "initial", lender, market],
    queryFn: queryLenderWithdrawals,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
    enabled: !!lender && !!market,
    refetchOnMount: false,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const withdrawals = data ?? {
    completeWithdrawals: [],
    expiredPendingWithdrawals: [],
    activeWithdrawal: undefined,
    expiredTotalPendingAmount: market?.underlyingToken.getAmount(0),
    activeTotalPendingAmount: market?.underlyingToken.getAmount(0),
    totalClaimableAmount: market?.underlyingToken.getAmount(0),
  }

  async function updateWithdrawals() {
    if (!lender || !market || !marketAddress) throw Error()
    const lens = getLensContract(TargetChainId, market.provider)
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

    const allWithdrawals = [
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...(withdrawals.completeWithdrawals ?? []),
      ...(withdrawals.expiredPendingWithdrawals ?? []),
    ]
    const expiredPendingWithdrawals = allWithdrawals.filter(
      (wd) =>
        wd.expiry !== market.pendingWithdrawalExpiry &&
        wd.normalizedAmountOwed.gt(0),
    )
    const activeWithdrawal = allWithdrawals.find(
      (wd) =>
        wd.expiry === market.pendingWithdrawalExpiry &&
        wd.status === BatchStatus.Pending,
    )
    const completeWithdrawals = allWithdrawals.filter(
      (wd) => wd.status === BatchStatus.Complete,
    )

    const activeTotalPendingAmount =
      activeWithdrawal?.requests.reduce(
        (acc, req) => acc.add(req.normalizedAmount),
        market.underlyingToken.getAmount(0),
      ) ?? market.underlyingToken.getAmount(0)

    const expiredTotalPendingAmount = expiredPendingWithdrawals
      .filter((w) => w.expiry !== market.pendingWithdrawalExpiry)
      .reduce(
        (acc, w) => acc.add(w.normalizedUnpaidAmount),
        market.underlyingToken.getAmount(0),
      )
    const totalClaimableAmount = (
      expiredPendingWithdrawals as LenderWithdrawalStatus[]
    ).reduce(
      (acc, w) => acc.add(w.availableWithdrawalAmount.raw),
      market.underlyingToken.getAmount(0),
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
    queryKey: [GET_LENDER_WITHDRAWALS_KEY, "update", updateQueryKeys],
    queryFn: updateWithdrawals,
    placeholderData: keepPreviousData,
    enabled: !!data,
    refetchOnMount: false,
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
