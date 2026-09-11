/* eslint-disable global-require, @typescript-eslint/no-var-requires */
describe("getBrowserRpcUrl", () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
    jest.resetModules()
  })

  it("falls back to Alchemy with the public key", () => {
    delete process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "k"
    jest.isolateModules(() => {
      const { getBrowserRpcUrl } = require("./rpcUrls")
      expect(getBrowserRpcUrl(11155111)).toBe(
        "https://eth-sepolia.g.alchemy.com/v2/k",
      )
      expect(getBrowserRpcUrl(9746)).toBe("https://testnet-rpc.plasma.to")
    })
  })
  it("uses NEXT_PUBLIC_RPC_URL_<NET> when set", () => {
    process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA = "http://127.0.0.1:18545"
    jest.isolateModules(() => {
      const { getBrowserRpcUrl } = require("./rpcUrls")
      expect(getBrowserRpcUrl(11155111)).toBe("http://127.0.0.1:18545")
      expect(getBrowserRpcUrl(1)).toMatch(/^https:\/\/eth-mainnet/)
    })
  })
  it("throws for an unknown chain", () => {
    jest.isolateModules(() => {
      const { getBrowserRpcUrl } = require("./rpcUrls")
      expect(() => getBrowserRpcUrl(42)).toThrow(/unknown chain/)
    })
  })
})
