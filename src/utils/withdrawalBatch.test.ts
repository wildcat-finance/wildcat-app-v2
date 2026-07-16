import { SupportedChainId, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"

import { applyLatestLensWithdrawalBatchUpdate } from "./withdrawalBatch"

describe("applyLatestLensWithdrawalBatchUpdate", () => {
  const update = {} as Parameters<WithdrawalBatch["applyLensUpdate"]>[0]

  it("preserves the explicit V2.5 expired status", () => {
    const applyLensUpdate = jest.fn()
    const batch = { applyLensUpdate } as unknown as WithdrawalBatch

    applyLatestLensWithdrawalBatchUpdate(
      batch,
      update,
      SupportedChainId.Sepolia,
    )

    expect(applyLensUpdate).toHaveBeenCalledWith(update, true)
  })

  it("keeps derived status decoding for legacy lens tuples", () => {
    const applyLensUpdate = jest.fn()
    const batch = { applyLensUpdate } as unknown as WithdrawalBatch

    applyLatestLensWithdrawalBatchUpdate(
      batch,
      update,
      SupportedChainId.Mainnet,
    )

    expect(applyLensUpdate).toHaveBeenCalledWith(update, false)
  })
})
