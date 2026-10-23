import type SafeAppsSDK from "@safe-global/safe-apps-sdk"

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
  beforeEach(() => {
    scope = { address, chainId: 1, selectedChainId: 1 }
    setSanctionsAccess(
      { ...scope, status: "clear", validUntil: Date.now() + 60_000 },
      () => scope,
    )
  })
  afterEach(clearSanctionsAccess)
  it("allows the screened wallet", () =>
    expect(() => assertSanctionsAccess(address, 1)).not.toThrow())
  it.each(["blocked", "checking", "unavailable"] as const)(
    "rejects a delayed prompt after becoming %s",
    async (status) => {
      const request = jest.fn()
      const transport = guardWalletTransport({ request }, address, 1)
      setSanctionsAccess(
        { ...scope, status, validUntil: Date.now() + 60_000 },
        () => scope,
      )
      await expect(
        transport.request({ method: "eth_sendTransaction" }),
      ).rejects.toThrow("screening")
      expect(request).not.toHaveBeenCalled()
    },
  )
  it.each([
    "personal_sign",
    "eth_signTypedData_v4",
    "eth_sendRawTransaction",
    "wallet_sendCalls",
  ])("guards %s", async (method) => {
    clearSanctionsAccess()
    await expect(
      guardWalletTransport({ request: jest.fn() }, address, 1).request({
        method,
      }),
    ).rejects.toThrow()
  })
  it("does not interrupt public reads or already submitted transaction polling", async () => {
    clearSanctionsAccess()
    const request = jest.fn().mockResolvedValue("receipt")
    expect(
      await guardWalletTransport({ request }, address, 1).request({
        method: "eth_getTransactionReceipt",
      }),
    ).toBe("receipt")
  })
  it.each(["address", "chainId", "selectedChainId"] as const)(
    "observes live %s changes before React effects run",
    (field) => {
      scope = {
        ...scope,
        [field]: field === "address" ? `0x${"b".repeat(40)}` : 9745,
      }
      expect(() => assertSanctionsAccess(address, 1)).toThrow()
    },
  )
  it("rejects expired approval even if background browser timers were suspended", () => {
    setSanctionsAccess(
      { ...scope, status: "clear", validUntil: Date.now() - 1 },
      () => scope,
    )
    expect(() => assertSanctionsAccess(address, 1)).toThrow()
  })

  it.each(["send", "signMessage", "signTypedMessage"])(
    "blocks a delayed Safe %s proposal after clearance is revoked",
    (method) => {
      const request = jest.fn()
      const sdk = { txs: { [method]: request } } as unknown as SafeAppsSDK
      const guarded = guardSafeSdk(sdk, address, 1)
      const propose = Reflect.get(guarded.txs, method)
      clearSanctionsAccess()
      expect(() => propose({})).toThrow("screening")
      expect(request).not.toHaveBeenCalled()
    },
  )
  it("preserves Safe method context and allows receipt reads after rejection", () => {
    const txs = {
      receipt: "pending",
      send: jest.fn().mockReturnThis(),
      getBySafeTxHash() {
        return this.receipt
      },
    }
    const sdk = { txs } as unknown as SafeAppsSDK
    const guarded = guardSafeSdk(sdk, address, 1)
    expect(guarded.txs.send({ txs: [] })).toBe(txs)
    clearSanctionsAccess()
    expect(guarded.txs.getBySafeTxHash("hash")).toBe("pending")
  })
})
