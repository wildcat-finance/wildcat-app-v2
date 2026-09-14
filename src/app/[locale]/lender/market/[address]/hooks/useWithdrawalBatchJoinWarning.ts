import { useCallback, useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketAccount,
  MarketVersion,
  rayMul,
  TokenAmount,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useLiveNowSeconds } from "@/hooks/useLiveNowSeconds"
import { cloneSdkObject } from "@/lib/sdk-object"

import {
  estimateWithdrawalBatchJoin,
  scaleWithdrawalRequest,
  WithdrawalBatchJoinEstimate,
} from "./withdrawalBatchJoin"

export type WithdrawalBatchJoinWarningState = "clear" | "warning" | "unknown"

export type WithdrawalBatchJoinWarningEstimate = {
  estimatedPayout: TokenAmount
  estimatedLoss: TokenAmount
  lossPercentThousandths: bigint
}

type BatchSnapshot = {
  batch: WithdrawalBatch | null
  scaleFactor: bigint
  withdrawalBatchDuration: number
}

const getActiveBatchExpiry = (
  market: Market,
  nowSeconds: number,
): number | undefined => {
  const expiry = market.pendingWithdrawalExpiry

  if (
    market.version !== MarketVersion.V2 ||
    market.isClosed ||
    !expiry ||
    expiry <= nowSeconds
  ) {
    return undefined
  }

  return expiry
}

export const useWithdrawalBatchJoinWarning = ({
  marketAccount,
  requestAmount,
  dustFloor,
  requestIsValid,
  useExactScaledBalance,
  enabled,
}: {
  marketAccount: MarketAccount
  requestAmount: TokenAmount
  dustFloor: TokenAmount
  requestIsValid: boolean
  useExactScaledBalance: boolean
  enabled: boolean
}) => {
  const { market } = marketAccount
  const shouldCheck =
    enabled && market.version === MarketVersion.V2 && !market.isClosed

  // Discover the batch on open, even before an amount is entered or when the
  // page's cached market says none exists. A null batch is a checked result.
  const batchQuery = useQuery<BatchSnapshot>({
    queryKey: QueryKeys.Lender.GET_WITHDRAWAL_BATCH_JOIN(
      market.chainId,
      market.address,
    ),
    enabled: shouldCheck,
    queryFn: async () => {
      // SDK update() mutates the market and its hooks config. Keep this read
      // separate from the page's cached market and the lender's amount form.
      const snapshotMarket = cloneSdkObject(market)
      if (market.hooksConfig) {
        snapshotMarket.hooksConfig = cloneSdkObject(market.hooksConfig)
      }
      await snapshotMarket.update()
      const expiry = getActiveBatchExpiry(snapshotMarket, Date.now() / 1000)
      const batch =
        expiry === undefined
          ? null
          : await WithdrawalBatch.getWithdrawalBatch(snapshotMarket, expiry)
      return {
        batch,
        scaleFactor: snapshotMarket.scaleFactor,
        withdrawalBatchDuration: snapshotMarket.withdrawalBatchDuration,
      }
    },
    refetchInterval: POLLING_INTERVAL,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 250,
  })
  const { refetch } = batchQuery
  const nowSeconds = useLiveNowSeconds(shouldCheck && !!batchQuery.data?.batch)
  const batchExpiry = batchQuery.data?.batch?.expiry
  const activeExpiry =
    batchExpiry !== undefined && batchExpiry > nowSeconds
      ? batchExpiry
      : undefined

  const calculateEstimate = useCallback(
    (snapshot: BatchSnapshot): WithdrawalBatchJoinEstimate | undefined => {
      const { batch, scaleFactor } = snapshot
      if (!batch || batch.expiry <= Date.now() / 1000) return undefined
      const requestScaledAmount = useExactScaledBalance
        ? marketAccount.scaledMarketBalance
        : scaleWithdrawalRequest(
            requestAmount.raw,
            scaleFactor,
            market.eventGeneration,
          )
      const requestAmountRaw = useExactScaledBalance
        ? rayMul(requestScaledAmount, scaleFactor)
        : requestAmount.raw

      return estimateWithdrawalBatchJoin({
        requestAmountRaw,
        requestScaledAmount,
        batchScaledTotalAmount: batch.scaledTotalAmount,
        batchNormalizedTotalAmountRaw: batch.normalizedTotalAmount.raw,
        scaleFactor,
      })
    },
    [
      market.eventGeneration,
      marketAccount.scaledMarketBalance,
      requestAmount.raw,
      useExactScaledBalance,
    ],
  )

  const estimate = useMemo(
    () =>
      activeExpiry !== undefined && batchQuery.data
        ? calculateEstimate(batchQuery.data)
        : undefined,
    [activeExpiry, batchQuery.data, calculateEstimate],
  )

  const hasMaterialLoss =
    !!estimate && estimate.estimatedLossRaw >= dustFloor.raw

  let state: WithdrawalBatchJoinWarningState = "clear"
  if (shouldCheck && requestIsValid) {
    if (batchQuery.isError) {
      state = "unknown"
    } else if (hasMaterialLoss) {
      state = "warning"
    }
  }

  const warningEstimate: WithdrawalBatchJoinWarningEstimate | undefined =
    estimate
      ? {
          estimatedPayout: market.underlyingToken.getAmount(
            estimate.estimatedPayoutRaw,
          ),
          estimatedLoss: market.underlyingToken.getAmount(
            estimate.estimatedLossRaw,
          ),
          lossPercentThousandths: estimate.lossPercentThousandths,
        }
      : undefined

  /**
   * Recheck a clear decision immediately before starting the transaction flow.
   * This closes the normal polling gap if another lender just opened a batch.
   */
  const refresh =
    useCallback(async (): Promise<WithdrawalBatchJoinWarningState> => {
      if (!shouldCheck || !requestIsValid) {
        return "clear"
      }

      // Share a read already in flight instead of cancelling/restarting it.
      const result = await refetch({ cancelRefetch: false })
      if (result.isError || !result.data) return "unknown"

      const latestEstimate = calculateEstimate(result.data)
      return latestEstimate && latestEstimate.estimatedLossRaw >= dustFloor.raw
        ? "warning"
        : "clear"
    }, [calculateEstimate, dustFloor.raw, refetch, requestIsValid, shouldCheck])

  return {
    state,
    // Pending reads affect the submit button, never the warning or layout.
    isChecking:
      shouldCheck &&
      (batchQuery.isPending || batchQuery.fetchStatus !== "idle"),
    estimate: warningEstimate,
    expiry: activeExpiry,
    openedSecondsAgo: activeExpiry
      ? Math.max(
          0,
          nowSeconds -
            (activeExpiry -
              (batchQuery.data?.withdrawalBatchDuration ??
                market.withdrawalBatchDuration)),
        )
      : 0,
    remainingSeconds: activeExpiry ? Math.max(0, activeExpiry - nowSeconds) : 0,
    refresh,
  }
}

export type WithdrawalBatchJoinWarningResult = ReturnType<
  typeof useWithdrawalBatchJoinWarning
>
