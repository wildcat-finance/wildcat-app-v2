/** @jest-environment node */

import type { PublicClient, WalletClient } from "viem"
import { encodeErrorResult } from "viem"

import { lenderPolicyErrorAbi } from "./lenderAccess"
import {
  getSafeTransactionResolution,
  SafeTransactionTerminalError,
  sendTransactionAndWait,
  waitForSafeTransactionExecution,
  waitForSubmittedTransaction,
} from "./transactions"

const policyAddress = "0x0000000000000000000000000000000000000001"
const borrowerAddress = "0x0000000000000000000000000000000000000002"
const lenderTx = { to: policyAddress, data: "0x12345678", value: "0" }

const transactionHash = `0x${"1".repeat(64)}`

const makeClients = (estimateGas: jest.Mock, sendTransaction: jest.Mock) => {
  const waitForTransactionReceipt = jest
    .fn()
    .mockResolvedValue({ status: "success" })
  const publicClient = {
    estimateGas,
    waitForTransactionReceipt,
  } as unknown as PublicClient
  const walletClient = {
    account: borrowerAddress,
    chain: { id: 1 },
    sendTransaction,
  } as unknown as WalletClient
  return { publicClient, walletClient, waitForTransactionReceipt }
}

describe("sendTransactionAndWait", () => {
  it("sends an explicit gas limit with headroom over the estimate", async () => {
    // Without a limit of our own the wallet picks one, and a wallet whose own
    // estimate fails falls back to a value the RPC refuses outright.
    const estimateGas = jest.fn().mockResolvedValue(BigInt(50268))
    const sendTransaction = jest.fn().mockResolvedValue(transactionHash)
    const { publicClient, walletClient, waitForTransactionReceipt } =
      makeClients(estimateGas, sendTransaction)

    await sendTransactionAndWait(publicClient, walletClient, lenderTx)

    expect(estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({
        to: policyAddress,
        account: borrowerAddress,
      }),
    )
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: BigInt(62835) }), // 50268 + 25%
    )
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: transactionHash,
    })
  })

  it("reports the decoded reason and never sends when the estimate reverts", async () => {
    const data = encodeErrorResult({
      abi: lenderPolicyErrorAbi,
      errorName: "ProviderNotFound",
    })
    const estimateGas = jest.fn().mockRejectedValue({ data })
    const sendTransaction = jest.fn()
    const { publicClient, walletClient } = makeClients(
      estimateGas,
      sendTransaction,
    )

    await expect(
      sendTransactionAndWait(publicClient, walletClient, lenderTx, {
        errorAbi: lenderPolicyErrorAbi,
      }),
    ).rejects.toThrow("not a role provider")
    expect(sendTransaction).not.toHaveBeenCalled()
  })

  it("reports a decoded wallet rejection after successful estimation", async () => {
    const data = encodeErrorResult({
      abi: lenderPolicyErrorAbi,
      errorName: "InvalidCredentialTimestamp",
    })
    const estimateGas = jest.fn().mockResolvedValue(BigInt(50000))
    const sendTransaction = jest.fn().mockRejectedValue({ cause: { data } })
    const { publicClient, walletClient } = makeClients(
      estimateGas,
      sendTransaction,
    )

    await expect(
      sendTransactionAndWait(publicClient, walletClient, lenderTx, {
        errorAbi: lenderPolicyErrorAbi,
      }),
    ).rejects.toThrow("ahead of the latest block")
  })

  it("rejects a transaction that was mined with reverted status", async () => {
    const estimateGas = jest.fn().mockResolvedValue(BigInt(50000))
    const sendTransaction = jest.fn().mockResolvedValue(transactionHash)
    const { publicClient, walletClient, waitForTransactionReceipt } =
      makeClients(estimateGas, sendTransaction)
    waitForTransactionReceipt.mockResolvedValueOnce({ status: "reverted" })

    await expect(
      sendTransactionAndWait(publicClient, walletClient, lenderTx),
    ).rejects.toThrow(`Transaction reverted: ${transactionHash}`)
  })
})

describe("waitForSubmittedTransaction", () => {
  it.each([
    { status: "reverted" },
    { status: 0 },
    { status: false },
    { status: BigInt(0) },
    { status: "0x0" },
  ])("rejects a failed mined receipt with status $status", async (receipt) => {
    const waitForTransaction = jest.fn().mockResolvedValue(receipt)

    await expect(
      waitForSubmittedTransaction({
        provider: { waitForTransaction },
        hash: transactionHash,
      }),
    ).rejects.toThrow(`Transaction reverted: ${transactionHash}`)
  })

  it("rejects a receipt without a success status", async () => {
    const waitForTransaction = jest.fn().mockResolvedValue({})

    await expect(
      waitForSubmittedTransaction({
        provider: { waitForTransaction },
        hash: transactionHash,
      }),
    ).rejects.toThrow(
      `Transaction success could not be confirmed: ${transactionHash}`,
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
