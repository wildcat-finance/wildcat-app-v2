/** @jest-environment node */
import { SupportedChainIds } from "@wildcatfi/wildcat-sdk"

jest.mock("wagmi", () => ({
  createConfig: jest.fn((input) => input),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  http: jest.fn((url) => ({ url })),
}))
jest.mock("wagmi/chains", () => jest.requireActual("viem/chains"))
jest.mock("wagmi/connectors", () => ({
  safe: jest.fn(() => ({})),
  walletConnect: jest.fn(() => ({})),
}))

describe("Ink Sepolia network wiring", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_TARGET_NETWORK = "InkSepolia"
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test-alchemy-key"
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  it("covers every SDK chain and selects Ink without enabling Ink mainnet", async () => {
    const { NETWORKS_BY_ID, TargetChainId } = await import("@/config/network")
    expect(Object.keys(NETWORKS_BY_ID).map(Number).sort()).toEqual(
      [...SupportedChainIds].sort(),
    )
    expect(TargetChainId).toBe(763373)
    expect(NETWORKS_BY_ID[763373]).toMatchObject({
      stringID: "ink-sepolia",
      name: "Ink Sepolia",
      isTestnet: true,
      hasV1Deployment: false,
      blockExplorerUrl: "https://explorer-sepolia.inkonchain.com",
    })
    expect(NETWORKS_BY_ID).not.toHaveProperty("57073")
    const { inkSepolia } = await import("./chains/ink-sepolia")
    expect(inkSepolia.nativeCurrency.symbol).toBe("ETH")
    expect(inkSepolia.contracts.multicall3).toEqual({
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    })
  })

  it.each(["test-alchemy-key", "replacement-test-key"])(
    "uses the shared Alchemy key: %s",
    async (key) => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = key
      const { inkSepolia } = await import("./chains/ink-sepolia")
      expect(inkSepolia.rpcUrls.default.http).toEqual([
        `https://ink-sepolia.g.alchemy.com/v2/${key}`,
      ])
    },
  )

  it("keeps all five Wagmi chains and makes Ink the configured default", async () => {
    const { config } = await import("./config")
    expect(config.chains.map((chain) => chain.id).sort()).toEqual(
      [...SupportedChainIds].sort(),
    )
    expect(config.chains[0].id).toBe(763373)
    const { createConfig: configured } = await import("wagmi")
    const input = jest.mocked(configured).mock.calls[0][0]
    expect(input.transports?.[763373]).toEqual({
      url: "https://ink-sepolia.g.alchemy.com/v2/test-alchemy-key",
    })
    expect(input.transports?.[1]).toEqual({
      url: "https://eth-mainnet.g.alchemy.com/v2/test-alchemy-key",
    })
    expect(input.transports?.[11155111]).toEqual({
      url: "https://eth-sepolia.g.alchemy.com/v2/test-alchemy-key",
    })
  })

  it.each([
    ["Mainnet", 1],
    ["Sepolia", 11155111],
    ["PlasmaMainnet", 9745],
    ["PlasmaTestnet", 9746],
  ])("retains %s as a selectable default", async (name, chainId) => {
    process.env.NEXT_PUBLIC_TARGET_NETWORK = String(name)
    const { config } = await import("./config")
    expect(config.chains[0].id).toBe(chainId)
    expect(config.chains.map((chain) => chain.id)).not.toContain(57073)
  })

  it("performs server reads through Alchemy with the same key", async () => {
    const methods: string[] = []
    const urls: string[] = []
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      urls.push(String(input))
      const payload = JSON.parse(String(init?.body))
      methods.push(payload.method)
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: payload.id,
          result: payload.method === "eth_chainId" ? "0xba5ed" : "0x2a",
        }),
        { headers: { "content-type": "application/json" } },
      )
    })
    const { getProviderForServer } = await import("./provider")
    const provider = getProviderForServer(763373)
    expect((await provider.getNetwork()).chainId).toBe(763373)
    expect(await provider.getBlockNumber()).toBe(42)
    expect(methods).toContain("eth_blockNumber")
    expect(
      urls.every(
        (url) =>
          url === "https://ink-sepolia.g.alchemy.com/v2/test-alchemy-key",
      ),
    ).toBe(true)
  })
})
