import {
  getSafeTransactionResolution,
  SafeTransactionTerminalError,
  sendTransactionAndWait,
  waitForSafeTransactionExecution,
} from "./transactions"

const lenderTx = { to: "0xpolicy", data: "0xgrantRole", value: "0" }

const submitted = () => ({
  hash: "0xhash",
  wait: jest.fn().mockResolvedValue({ status: "success" }),
})

const makeSigner = (provider: unknown, sendTransaction: jest.Mock) =>
  ({
    getAddress: jest.fn().mockResolvedValue("0xborrower"),
    provider,
    sendTransaction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

describe("sendTransactionAndWait", () => {
  it("sends an explicit gas limit with headroom over the estimate", async () => {
    // Without a limit of our own the wallet picks one, and a wallet whose own
    // estimate fails falls back to a value the RPC refuses outright.
    const estimateGas = jest.fn().mockResolvedValue(BigInt(50268))
    const sendTransaction = jest.fn().mockResolvedValue(submitted())

    await sendTransactionAndWait(
      makeSigner({ estimateGas }, sendTransaction),
      lenderTx,
    )

    expect(estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({ to: "0xpolicy", from: "0xborrower" }),
    )
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: BigInt(62835) }), // 50268 + 25%
    )
  })

  it("reports the decoded reason and never sends when the estimate reverts", async () => {
    const estimateGas = jest.fn().mockRejectedValue({ data: "0xb1cd0903" })
    const sendTransaction = jest.fn()

    await expect(
      sendTransactionAndWait(
        makeSigner({ estimateGas }, sendTransaction),
        lenderTx,
        {
          errorInterface: { parseError: () => ({ name: "ProviderNotFound" }) },
        },
      ),
    ).rejects.toThrow("not a role provider")
    expect(sendTransaction).not.toHaveBeenCalled()
  })

  it("still sends when the signer cannot estimate", async () => {
    const sendTransaction = jest.fn().mockResolvedValue(submitted())

    await sendTransactionAndWait(makeSigner({}, sendTransaction), lenderTx)

    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: undefined }),
    )
  })
})

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
