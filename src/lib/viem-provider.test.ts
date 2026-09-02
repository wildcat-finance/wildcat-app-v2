/** @jest-environment node */

import type { PublicClient, WalletClient } from "viem"

import { createViemProvider, createViemSigner } from "./viem-provider"

const accountAddress = "0x0000000000000000000000000000000000000001"
const marketAddress = "0x0000000000000000000000000000000000000002"
const transactionHash = `0x${"1".repeat(64)}`

describe("createViemSigner", () => {
  it("adds gas headroom to SDK-backed writes", async () => {
    const estimateGas = jest.fn().mockResolvedValue(BigInt(97979))
    const sendTransaction = jest.fn().mockResolvedValue(transactionHash)
    const publicClient = { estimateGas } as unknown as PublicClient
    const walletClient = {
      account: { address: accountAddress },
      chain: { id: 11155111 },
      sendTransaction,
    } as unknown as WalletClient
    const signer = createViemSigner({ publicClient, walletClient })

    await signer?.sendTransaction({
      to: marketAddress,
      data: "0x12345678",
      value: "0",
    })

    expect(estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({
        account: accountAddress,
        to: marketAddress,
      }),
    )
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: BigInt(122473) }),
    )
  })
})

describe("createViemProvider", () => {
  it("rejects a reverted receipt from an SDK transaction wait", async () => {
    const waitForTransactionReceipt = jest
      .fn()
      .mockResolvedValue({ status: "reverted" })
    const provider = createViemProvider({
      waitForTransactionReceipt,
    } as unknown as PublicClient)

    await expect(provider.waitForTransaction(transactionHash)).rejects.toThrow(
      `Transaction reverted: ${transactionHash}`,
    )
  })
})
