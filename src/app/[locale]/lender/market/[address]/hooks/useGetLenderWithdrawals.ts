/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { useEffect, useMemo } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  getLensV2Contract,
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
import { useAccount, useBlockNumber } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { usePageVisible } from "@/hooks/usePageVisible"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
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
  const subgraphClient = useSubgraphClient()
  const { address } = useAccount()
  const { chainId: targetChainId } = useSelectedNetwork()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const isVisible = usePageVisible()
  const lender = address?.toLowerCase()
  const marketAddress = market?.address.toLowerCase()
  const refetchInterval = isVisible ? POLLING_INTERVAL : false
  async function queryLenderWithdrawals() {
    if (
      !lender ||
      !market ||
      !marketAddress ||
      market.chainId !== targetChainId
    )
      throw Error()
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
    for (const withdrawal of incompleteWithdrawals) {
      console.log(
        `Withdrawal ${withdrawal.expiry} ${withdrawal.requests.length} requests`,
      )
    }
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
    queryKey: QueryKeys.Lender.GET_WITHDRAWALS.INITIAL(
      market?.chainId ?? targetChainId,
      lender,
      marketAddress,
    ),
    queryFn: queryLenderWithdrawals,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: !!lender && !!market,
    // refetchOnMount: false,
  })

  const withdrawals = data ?? {
    completeWithdrawals: [],
    expiredPendingWithdrawals: [],
    activeWithdrawal: undefined,
    expiredTotalPendingAmount: market?.underlyingToken.getAmount(0),
    activeTotalPendingAmount: market?.underlyingToken.getAmount(0),
    totalClaimableAmount: market?.underlyingToken.getAmount(0),
  }

  async function updateWithdrawals() {
    console.log(`Updating withdrawals...`)
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

    const allWithdrawals = [
      ...(withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []),
      ...(withdrawals.completeWithdrawals ?? []),
      ...(withdrawals.expiredPendingWithdrawals ?? []),
    ]
    const expiredPendingWithdrawals: LenderWithdrawalStatus[] = []
    let activeWithdrawal: LenderWithdrawalStatus | undefined
    const completeWithdrawals: LenderWithdrawalStatus[] = []
    for (const wd of allWithdrawals) {
      if (wd.status === BatchStatus.Pending) {
        activeWithdrawal = wd
      } else if (wd.status === BatchStatus.Complete && wd.isCompleted) {
        completeWithdrawals.push(wd)
      } else {
        expiredPendingWithdrawals.push(wd)
      }
    }

    const activeTotalPendingAmount =
      activeWithdrawal?.requests.reduce(
        (acc, req) => acc.add(req.normalizedAmount),
        market.underlyingToken.getAmount(0),
      ) ?? market.underlyingToken.getAmount(0)

    const expiredTotalPendingAmount = expiredPendingWithdrawals
      // .filter((w) => w.expiry !== market.pendingWithdrawalExpiry)
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
    queryKey: QueryKeys.Lender.GET_WITHDRAWALS.UPDATE(
      market?.chainId ?? targetChainId,
      lender,
      marketAddress,
      updateQueryKeys,
    ),
    queryFn: updateWithdrawals,
    placeholderData: keepPreviousData,
    enabled: !!data && isVisible,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    // refetchOnMount: false,
  })

  useEffect(() => {
    if (!data || !isVisible || blockNumber === undefined) return
    refetchUpdate()
  }, [blockNumber, data, isVisible, refetchUpdate])

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
