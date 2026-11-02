import type SafeAppsSDK from "@safe-global/safe-apps-sdk"

import { SanctionsState } from "@/utils/sanctions"

import {
  assertSanctionsAccess,
  clearSanctionsAccess,
  guardSafeSdk,
  guardWalletTransport,
  setSanctionsAccess,
  WalletScope,
} from "./sanctionsAccess"

const address = `0x${"a".repeat(40)}`
describe("wallet signing guard", () => {
  let scope: WalletScope
  const publish = (status: SanctionsState, published = scope) =>
    setSanctionsAccess({ ...published, status }, () => scope)
  beforeEach(() => {
    scope = { address, chainId: 1, selectedChainId: 1 }
    publish("clear")
  })
  afterEach(() => {
    clearSanctionsAccess()
    jest.useRealTimers()
  })

  it.each(["clear", "unavailable"] as const)(
    "lets a %s wallet sign",
    async (status) => {
      publish(status)
      await expect(assertSanctionsAccess(address, 1)).resolves.toBeUndefined()
    },
  )
  it("lets wallets sign when no screening is registered", async () => {
    clearSanctionsAccess()
    await expect(assertSanctionsAccess(address, 1)).resolves.toBeUndefined()
  })
  it("rejects a delayed prompt after the wallet is flagged", async () => {
    const request = jest.fn()
    const transport = guardWalletTransport({ request }, address, 1)
    publish("blocked")
    await expect(
      transport.request({ method: "eth_sendTransaction" }),
    ).rejects.toThrow("sanctions screening")
    expect(request).not.toHaveBeenCalled()
  })
  it.each(["clear", "blocked"] as const)(
    "waits for a check in flight, then follows a %s result",
    async (status) => {
      publish("checking")
      const request = jest.fn().mockResolvedValue("0xtx")
      const pending = guardWalletTransport({ request }, address, 1).request({
        method: "eth_sendTransaction",
      })
      await Promise.resolve()
      expect(request).not.toHaveBeenCalled()
      publish(status)
      if (status === "clear") await expect(pending).resolves.toBe("0xtx")
      else await expect(pending).rejects.toThrow("sanctions screening")
    },
  )
  it("waits until the gate publishes a selected network change", async () => {
    scope = { ...scope, selectedChainId: 9745 }
    let settled = false
    const pending = assertSanctionsAccess(address, 1).finally(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    publish("blocked")
    await expect(pending).rejects.toThrow("sanctions screening")
  })
  it("lets the prompt through if screening outlives the timeout", async () => {
    jest.useFakeTimers()
    publish("checking")
    const pending = assertSanctionsAccess(address, 1)
    await jest.advanceTimersByTimeAsync(10_000)
    await expect(pending).resolves.toBeUndefined()
  })
  it.each(["address", "chainId"] as const)(
    "rejects a stale signer after a live %s change",
    async (field) => {
      scope = {
        ...scope,
        [field]: field === "address" ? `0x${"b".repeat(40)}` : 9745,
      }
      await expect(assertSanctionsAccess(address, 1)).rejects.toThrow(
        "wallet changed",
      )
    },
  )
  it.each([
    "personal_sign",
    "eth_signTypedData_v4",
    "eth_sendRawTransaction",
    "wallet_sendCalls",
  ])("guards %s", async (method) => {
    publish("blocked")
    await expect(
      guardWalletTransport({ request: jest.fn() }, address, 1).request({
        method,
      }),
    ).rejects.toThrow()
  })
  it("does not interrupt public reads or already submitted transaction polling", async () => {
    publish("blocked")
    const request = jest.fn().mockResolvedValue("receipt")
    expect(
      await guardWalletTransport({ request }, address, 1).request({
        method: "eth_getTransactionReceipt",
      }),
    ).toBe("receipt")
  })

  it.each(["send", "signMessage", "signTypedMessage"])(
    "blocks a delayed Safe %s proposal after the wallet is flagged",
    async (method) => {
      const request = jest.fn()
      const sdk = { txs: { [method]: request } } as unknown as SafeAppsSDK
      const guarded = guardSafeSdk(sdk, address, 1)
      const propose = Reflect.get(guarded.txs, method)
      publish("blocked")
      await expect(propose({})).rejects.toThrow("sanctions screening")
      expect(request).not.toHaveBeenCalled()
    },
  )
  it("preserves Safe method context and allows receipt reads after a flag", async () => {
    const txs = {
      receipt: "pending",
      send: jest.fn().mockReturnThis(),
      getBySafeTxHash() {
        return this.receipt
      },
    }
    const sdk = { txs } as unknown as SafeAppsSDK
    const guarded = guardSafeSdk(sdk, address, 1)
    expect(await guarded.txs.send({ txs: [] })).toBe(txs)
    publish("blocked")
    expect(guarded.txs.getBySafeTxHash("hash")).toBe("pending")
  })
})
