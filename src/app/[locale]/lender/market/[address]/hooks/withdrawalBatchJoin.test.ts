import { RAY } from "@wildcatfi/wildcat-sdk"

import {
  estimateWithdrawalBatchJoin,
  scaleWithdrawalRequest,
} from "./withdrawalBatchJoin"

describe("withdrawal batch join estimate", () => {
  it("reproduces the documented blended-rate example", () => {
    const requestAmountRaw = 200n
    const requestScaledAmount = scaleWithdrawalRequest(
      requestAmountRaw,
      2n * RAY,
      "legacy",
    )

    expect(
      estimateWithdrawalBatchJoin({
        requestAmountRaw,
        requestScaledAmount,
        batchScaledTotalAmount: 100n,
        batchNormalizedTotalAmountRaw: 100n,
        scaleFactor: 2n * RAY,
      }),
    ).toEqual({
      scaledRequestAmount: 100n,
      estimatedPayoutRaw: 150n,
      estimatedLossRaw: 50n,
      lossPercentThousandths: 25_000n,
    })
  })

  it("does not report a loss when the batch is still priced at the current rate", () => {
    expect(
      estimateWithdrawalBatchJoin({
        requestAmountRaw: 200n,
        requestScaledAmount: 100n,
        batchScaledTotalAmount: 100n,
        batchNormalizedTotalAmountRaw: 200n,
        scaleFactor: 2n * RAY,
      }),
    ).toEqual({
      scaledRequestAmount: 100n,
      estimatedPayoutRaw: 200n,
      estimatedLossRaw: 0n,
      lossPercentThousandths: 0n,
    })
  })

  it("accounts for value already paid into a partially burned batch", () => {
    expect(
      estimateWithdrawalBatchJoin({
        requestAmountRaw: 200n,
        requestScaledAmount: 100n,
        batchScaledTotalAmount: 100n,
        batchNormalizedTotalAmountRaw: 150n,
        scaleFactor: 2n * RAY,
      }),
    ).toEqual({
      scaledRequestAmount: 100n,
      estimatedPayoutRaw: 175n,
      estimatedLossRaw: 25n,
      lossPercentThousandths: 12_500n,
    })
  })

  it("matches the generation-specific request rounding", () => {
    expect(scaleWithdrawalRequest(5n, 2n * RAY, "v2.5")).toBe(2n)
    expect(scaleWithdrawalRequest(5n, 2n * RAY, "legacy")).toBe(3n)
    expect(scaleWithdrawalRequest(5n, 2n * RAY, "unknown")).toBe(3n)
  })

  it("returns no estimate without an existing batch or request", () => {
    expect(
      estimateWithdrawalBatchJoin({
        requestAmountRaw: 100n,
        requestScaledAmount: 100n,
        batchScaledTotalAmount: 0n,
        batchNormalizedTotalAmountRaw: 0n,
        scaleFactor: RAY,
      }),
    ).toBeUndefined()

    expect(
      estimateWithdrawalBatchJoin({
        requestAmountRaw: 0n,
        requestScaledAmount: 0n,
        batchScaledTotalAmount: 100n,
        batchNormalizedTotalAmountRaw: 100n,
        scaleFactor: RAY,
      }),
    ).toBeUndefined()
  })

  it("reports percentage points to three decimal places", () => {
    const estimate = estimateWithdrawalBatchJoin({
      requestAmountRaw: 100_000n,
      requestScaledAmount: 100_000n,
      batchScaledTotalAmount: 100_000n,
      batchNormalizedTotalAmountRaw: 99_856n,
      scaleFactor: RAY,
    })

    expect(estimate?.estimatedLossRaw).toBe(72n)
    expect(estimate?.lossPercentThousandths).toBe(72n)
  })

  it("rounds the displayed percentage to the nearest thousandth", () => {
    const estimate = estimateWithdrawalBatchJoin({
      requestAmountRaw: 50_000_000n,
      requestScaledAmount: 50_000_000n,
      batchScaledTotalAmount: 50_000_000n,
      batchNormalizedTotalAmountRaw: 49_928_300n,
      scaleFactor: RAY,
    })

    expect(estimate?.estimatedLossRaw).toBe(35_850n)
    expect(estimate?.lossPercentThousandths).toBe(72n)
  })
})
