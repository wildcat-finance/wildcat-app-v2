import type { walletConnect } from "wagmi/connectors"

import {
  WALLETCONNECT_APPROVAL_WINDOW_SECONDS,
  WALLETCONNECT_DEFAULT_EXPIRY_SECONDS,
  withWalletConnectApprovalWindow,
} from "@/lib/walletConnectRequestExpiry"

type ConnectorFn = ReturnType<typeof walletConnect>
type ConnectorConfig = Parameters<ConnectorFn>[0]

const setup = () => {
  const request = jest.fn().mockResolvedValue("0xresult")
  const provider = { request }
  const receivers: unknown[] = []
  const createConnector = (() => ({
    id: "walletConnect",
    async getProvider(this: unknown) {
      receivers.push(this)
      return provider
    },
  })) as unknown as ConnectorFn
  const connector = withWalletConnectApprovalWindow(createConnector)(
    {} as ConnectorConfig,
  )
  return { connector, provider, request, receivers }
}

describe("withWalletConnectApprovalWindow", () => {
  it.each([
    "personal_sign",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
    "wallet_sendCalls",
  ])("gives %s the longer approval window", async (method) => {
    const { connector, request } = setup()
    const provider = await connector.getProvider()

    await provider.request({ method, params: [] })

    expect(request).toHaveBeenCalledWith(
      { method, params: [] },
      WALLETCONNECT_APPROVAL_WINDOW_SECONDS,
    )
  })

  it.each(["eth_chainId", "eth_accounts", "wallet_switchEthereumChain"])(
    "keeps %s on five minutes, stated explicitly",
    async (method) => {
      const { connector, request } = setup()
      const provider = await connector.getProvider()

      await provider.request({ method })

      expect(request).toHaveBeenCalledWith(
        { method },
        WALLETCONNECT_DEFAULT_EXPIRY_SECONDS,
      )
    },
  )

  it("keeps an expiry the caller chose", async () => {
    const { connector, request } = setup()
    const provider = await connector.getProvider()

    await provider.request({ method: "personal_sign", params: [] }, 600)

    expect(request).toHaveBeenCalledWith(
      { method: "personal_sign", params: [] },
      600,
    )
  })

  it("wraps the cached provider once and returns the wallet's reply", async () => {
    const { connector, request } = setup()
    await connector.getProvider()
    const provider = await connector.getProvider()

    await expect(
      provider.request({ method: "personal_sign", params: [] }),
    ).resolves.toBe("0xresult")
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("calls the connector's own getProvider on the object wagmi uses", async () => {
    const { connector, receivers } = setup()
    // wagmi spreads the connector into its own object before calling it.
    const used = { ...connector, uid: "test" }

    await used.getProvider()

    expect(receivers).toEqual([used])
  })

  it("is one hour, inside WalletConnect's five-minute to seven-day bounds", () => {
    expect(WALLETCONNECT_APPROVAL_WINDOW_SECONDS).toBe(3600)
    expect(WALLETCONNECT_DEFAULT_EXPIRY_SECONDS).toBe(300)
  })
})
