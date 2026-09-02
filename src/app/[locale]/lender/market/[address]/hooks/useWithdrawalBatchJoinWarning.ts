import { useCallback, useEffect, useMemo, useState } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketVersion,
  rayMul,
  TokenAmount,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useLiveNowSeconds } from "@/hooks/useLiveNowSeconds"

import {
  estimateWithdrawalBatchJoin,
  scaleWithdrawalRequest,
  WithdrawalBatchJoinEstimate,
} from "./withdrawalBatchJoin"

export type WithdrawalBatchJoinWarningState =
  | "clear"
  | "loading"
  | "warning"
  | "unknown"

export type WithdrawalBatchJoinWarningEstimate = {
  estimatedPayout: TokenAmount
  estimatedLoss: TokenAmount
  lossPercentThousandths: bigint
}

type BatchSnapshot = {
  batch: WithdrawalBatch
  scaleFactor: bigint
}

const getActiveBatchExpiry = (
  marketAccount: MarketAccount,
  nowSeconds: number,
): number | undefined => {
  const { market } = marketAccount
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
  const queryClient = useQueryClient()
  const nowSeconds = useLiveNowSeconds(
    enabled &&
      market.version === MarketVersion.V2 &&
      !market.isClosed &&
      market.pendingWithdrawalExpiry > 0,
  )
  const activeExpiry = getActiveBatchExpiry(marketAccount, nowSeconds)
  const [isDecisionRefreshPending, setIsDecisionRefreshPending] =
    useState(false)
  const [decisionRefreshFailed, setDecisionRefreshFailed] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsDecisionRefreshPending(false)
      setDecisionRefreshFailed(false)
    }
  }, [enabled])

  const queryKey = QueryKeys.Lender.GET_WITHDRAWAL_BATCH_JOIN(
    market.chainId,
    market.address,
    activeExpiry,
  )
  const batchQuery = useQuery<BatchSnapshot>({
    queryKey,
    enabled: enabled && activeExpiry !== undefined,
    queryFn: async () => {
      if (activeExpiry === undefined) {
        throw new Error("No active withdrawal batch")
      }

      const batch = await WithdrawalBatch.getWithdrawalBatch(
        market,
        activeExpiry,
      )
      return { batch, scaleFactor: market.scaleFactor }
    },
    refetchInterval: POLLING_INTERVAL,
    staleTime: POLLING_INTERVAL,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 250,
  })

  useEffect(() => {
    if (batchQuery.data) setDecisionRefreshFailed(false)
  }, [batchQuery.data])

  const calculateEstimate = useCallback(
    (snapshot: BatchSnapshot): WithdrawalBatchJoinEstimate | undefined => {
      const { batch, scaleFactor } = snapshot
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
    () => (batchQuery.data ? calculateEstimate(batchQuery.data) : undefined),
    [batchQuery.data, calculateEstimate],
  )

  const hasMaterialLoss =
    !!estimate && estimate.estimatedLossRaw >= dustFloor.raw

  let state: WithdrawalBatchJoinWarningState = "clear"
  if (enabled && requestIsValid) {
    if (isDecisionRefreshPending) {
      state = "loading"
    } else if (decisionRefreshFailed) {
      state = "unknown"
    } else if (activeExpiry !== undefined) {
      if (batchQuery.isPending) {
        state = "loading"
      } else if (batchQuery.isError || !batchQuery.data) {
        state = "unknown"
      } else if (hasMaterialLoss) {
        state = "warning"
      }
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
      if (!enabled || !requestIsValid || market.version !== MarketVersion.V2) {
        return "clear"
      }

      setIsDecisionRefreshPending(true)
      setDecisionRefreshFailed(false)
      try {
        await market.update()
        const now = Date.now() / 1000
        const latestExpiry = getActiveBatchExpiry(marketAccount, now)
        if (latestExpiry === undefined) return "clear"

        const batch = await WithdrawalBatch.getWithdrawalBatch(
          market,
          latestExpiry,
        )
        const snapshot = { batch, scaleFactor: market.scaleFactor }
        queryClient.setQueryData(
          QueryKeys.Lender.GET_WITHDRAWAL_BATCH_JOIN(
            market.chainId,
            market.address,
            latestExpiry,
          ),
          snapshot,
        )

        const latestEstimate = calculateEstimate(snapshot)
        if (!latestEstimate) return "clear"
        return latestEstimate.estimatedLossRaw >= dustFloor.raw
          ? "warning"
          : "clear"
      } catch {
        setDecisionRefreshFailed(true)
        return "unknown"
      } finally {
        setIsDecisionRefreshPending(false)
      }
    }, [
      calculateEstimate,
      dustFloor.raw,
      enabled,
      market,
      marketAccount,
      queryClient,
      requestIsValid,
    ])

  return {
    state,
    estimate: warningEstimate,
    expiry: activeExpiry,
    openedSecondsAgo: activeExpiry
      ? Math.max(
          0,
          nowSeconds - (activeExpiry - market.withdrawalBatchDuration),
        )
      : 0,
    remainingSeconds: activeExpiry ? Math.max(0, activeExpiry - nowSeconds) : 0,
    refresh,
  }
}

export type WithdrawalBatchJoinWarningResult = ReturnType<
  typeof useWithdrawalBatchJoinWarning
>
