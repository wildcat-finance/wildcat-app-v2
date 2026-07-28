import {
  getSafeTransactionResolution,
  SafeTransactionTerminalError,
  waitForSafeTransactionExecution,
} from "./transactions"

describe("Safe transaction recovery", () => {
  it("classifies pending, executed, and terminal transactions", () => {
    expect(
      getSafeTransactionResolution({
        txStatus: "AWAITING_CONFIRMATIONS",
      }),
    ).toEqual({ status: "pending" })
    expect(
      getSafeTransactionResolution({
        txStatus: "SUCCESS",
        txHash: "0xexecuted",
      }),
    ).toEqual({
      status: "executed",
      transactionHash: "0xexecuted",
    })
    expect(
      getSafeTransactionResolution({
        txStatus: "CANCELLED",
      }),
    ).toEqual({
      status: "terminal",
      transactionStatus: "CANCELLED",
    })
  })

  it("returns an executed transaction hash without proposing again", async () => {
    const getBySafeTxHash = jest.fn().mockResolvedValue({
      txStatus: "SUCCESS",
      txHash: "0xexecuted",
    })

    await expect(
      waitForSafeTransactionExecution({ txs: { getBySafeTxHash } }, "0xsafe"),
    ).resolves.toBe("0xexecuted")
    expect(getBySafeTxHash).toHaveBeenCalledTimes(1)
    expect(getBySafeTxHash).toHaveBeenCalledWith("0xsafe")
  })

  it("rejects cancelled and failed proposals so callers can clear them", async () => {
    const getBySafeTxHash = jest.fn().mockResolvedValue({
      txStatus: "FAILED",
    })

    await expect(
      waitForSafeTransactionExecution({ txs: { getBySafeTxHash } }, "0xsafe"),
    ).rejects.toEqual(new SafeTransactionTerminalError("0xsafe", "FAILED"))
  })
})
