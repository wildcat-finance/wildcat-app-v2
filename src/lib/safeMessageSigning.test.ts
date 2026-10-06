import SafeAppsSDK from "@safe-global/safe-apps-sdk"

import {
  getPendingSafeMessageId,
  proposeSafeMessage,
} from "@/lib/safeMessageSigning"

describe("proposeSafeMessage", () => {
  const setSafeSettings = jest.fn()
  const signMessage = jest.fn()
  const sdk = {
    eth: { setSafeSettings },
    txs: { signMessage },
  } as unknown as SafeAppsSDK

  beforeEach(() => {
    jest.clearAllMocks()
    setSafeSettings.mockResolvedValue([{ offChainSigning: true }])
  })

  it("returns an off-chain pending message hash", async () => {
    signMessage.mockResolvedValue({ messageHash: "0xmessage" })

    await expect(proposeSafeMessage(sdk, "hello")).resolves.toEqual({
      kind: "offchain",
      messageHash: "0xmessage",
    })
    expect(setSafeSettings).toHaveBeenCalledWith([{ offChainSigning: true }])
    expect(signMessage).toHaveBeenCalledWith("hello")
  })

  it("retains the on-chain Safe transaction fallback", async () => {
    signMessage.mockResolvedValue({ safeTxHash: "0xtx" })

    const proposal = await proposeSafeMessage(sdk, "hello")
    expect(proposal).toEqual({ kind: "onchain", safeTxHash: "0xtx" })
    expect(
      getPendingSafeMessageId({
        chainId: 1,
        address: "0xABC",
        proposal,
      }),
    ).toBe("1:0xabc:onchain:0xtx")
  })
})
