import { mulDiv, RAY, rayDiv, rayMul } from "@wildcatfi/wildcat-sdk"

export type WithdrawalBatchEventGeneration = "legacy" | "v2.5" | "unknown"

export type WithdrawalBatchJoinEstimate = {
  scaledRequestAmount: bigint
  estimatedPayoutRaw: bigint
  estimatedLossRaw: bigint
  lossPercentThousandths: bigint
}

/** Mirrors the rounding used when a V2 market turns a request into shares. */
export const scaleWithdrawalRequest = (
  normalizedAmount: bigint,
  scaleFactor: bigint,
  eventGeneration: WithdrawalBatchEventGeneration,
): bigint => {
  if (normalizedAmount <= 0n || scaleFactor <= 0n) return 0n

  if (eventGeneration === "v2.5") {
    return mulDiv(normalizedAmount, RAY, scaleFactor)
  }

  return rayDiv(normalizedAmount, scaleFactor)
}

/**
 * Prices a new request at the current blended rate of an existing batch.
 * The result is a snapshot: later interest, payments, and requests can move it.
 */
export const estimateWithdrawalBatchJoin = ({
  requestAmountRaw,
  requestScaledAmount,
  batchScaledTotalAmount,
  batchNormalizedTotalAmountRaw,
  scaleFactor,
}: {
  requestAmountRaw: bigint
  requestScaledAmount: bigint
  batchScaledTotalAmount: bigint
  batchNormalizedTotalAmountRaw: bigint
  scaleFactor: bigint
}): WithdrawalBatchJoinEstimate | undefined => {
  if (
    requestAmountRaw <= 0n ||
    requestScaledAmount <= 0n ||
    batchScaledTotalAmount <= 0n ||
    batchNormalizedTotalAmountRaw < 0n ||
    scaleFactor <= 0n
  ) {
    return undefined
  }

  const requestValueRaw = rayMul(requestScaledAmount, scaleFactor)
  const estimatedPayoutRaw = mulDiv(
    batchNormalizedTotalAmountRaw + requestValueRaw,
    requestScaledAmount,
    batchScaledTotalAmount + requestScaledAmount,
  )
  const estimatedLossRaw =
    requestAmountRaw > estimatedPayoutRaw
      ? requestAmountRaw - estimatedPayoutRaw
      : 0n
  const lossPercentThousandths =
    estimatedLossRaw === 0n
      ? 0n
      : (estimatedLossRaw * 100_000n + requestAmountRaw / 2n) / requestAmountRaw

  return {
    scaledRequestAmount: requestScaledAmount,
    estimatedPayoutRaw,
    estimatedLossRaw,
    lossPercentThousandths,
  }
}
