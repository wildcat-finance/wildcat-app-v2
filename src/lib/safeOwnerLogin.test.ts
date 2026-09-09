/** @jest-environment node */

import { recoverMessageAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type { Config, Connector } from "wagmi"
import { getPublicClient, getWalletClient } from "wagmi/actions"

import { getLoginSignatureMessage } from "@/config/api"

import { signSafeOwnerLogin } from "./safeOwnerLogin"

jest.mock("wagmi/actions", () => ({
  getPublicClient: jest.fn(),
  getWalletClient: jest.fn(),
}))

const owner = privateKeyToAccount(`0x${"11".repeat(32)}`)
const stranger = privateKeyToAccount(`0x${"22".repeat(32)}`)
const address = "0xC15bE5214978d1fc509ECdd4f9D5BC067C94D9Ae"
const ownerConfig = {} as Config
const connector = {} as Connector
const readContract = jest.fn()
const signMessage = jest.fn(({ message }: { message: string }) =>
  owner.signMessage({ message }),
)

const setupWallet = (chainId: number) => {
  jest.mocked(getWalletClient).mockResolvedValue({
    account: { address: owner.address },
    chain: { id: chainId },
    signMessage,
  } as unknown as Awaited<ReturnType<typeof getWalletClient>>)
  jest.mocked(getPublicClient).mockReturnValue({
    readContract,
  } as unknown as ReturnType<typeof getPublicClient>)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupWallet(9745)
  readContract.mockResolvedValue([owner.address.toLowerCase()])
})

it.each([1, 11155111, 9745, 9746])(
  "signs the original login message for the Safe on chain %s",
  async (chainId) => {
    setupWallet(chainId)
    const result = await signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId },
      new AbortController().signal,
    )
    const message = getLoginSignatureMessage(
      address,
      result.timeSigned,
      chainId,
    )
    expect(
      await recoverMessageAddress({
        message,
        signature: result.signature as `0x${string}`,
      }),
    ).toBe(owner.address)
    expect(signMessage).toHaveBeenCalledWith({ message })
    expect(getPublicClient).toHaveBeenCalledWith(ownerConfig, { chainId })
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ address, functionName: "getOwners" }),
    )
  },
)

it("rejects a non-owner before requesting a signature", async () => {
  readContract.mockResolvedValue([stranger.address])
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("not an owner")
  expect(signMessage).not.toHaveBeenCalled()
})

it("rejects the wrong wallet network before looking up owners or signing", async () => {
  setupWallet(1)
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("Switch your owner wallet")
  expect(readContract).not.toHaveBeenCalled()
  expect(signMessage).not.toHaveBeenCalled()
})

it("does not prompt for a signature if login was cancelled during the owner lookup", async () => {
  const controller = new AbortController()
  readContract.mockImplementationOnce(async () => {
    controller.abort()
    return [owner.address]
  })
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      controller.signal,
    ),
  ).rejects.toThrow()
  expect(signMessage).not.toHaveBeenCalled()
})

it("rejects a wallet response signed by a different account", async () => {
  signMessage.mockImplementationOnce(({ message }) =>
    stranger.signMessage({ message }),
  )
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("did not return the requested owner signature")
})

it("propagates wallet rejection so the user can retry", async () => {
  signMessage.mockRejectedValueOnce(new Error("User rejected the request"))
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("User rejected")
})

it("discards a signature returned after cancellation", async () => {
  const controller = new AbortController()
  signMessage.mockImplementationOnce(async ({ message }) => {
    const signature = await owner.signMessage({ message })
    controller.abort()
    return signature
  })
  await expect(
    signSafeOwnerLogin(
      ownerConfig,
      connector,
      { address, chainId: 9745 },
      controller.signal,
    ),
  ).rejects.toThrow("Login cancelled")
})
