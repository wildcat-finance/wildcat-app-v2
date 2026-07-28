/**
 * @jest-environment node
 */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getProviderForServer, getViemPublicClientForServer } from "./provider"

const mockPublicClient = { request: jest.fn() }
const mockCreatePublicClient = jest.fn().mockReturnValue(mockPublicClient)
const mockHttp = jest.fn((url: string) => ({ url }))
const mockViemProvider = { request: jest.fn() }
const mockCreateViemProvider = jest.fn().mockReturnValue(mockViemProvider)

jest.mock("viem", () => ({
  ...jest.requireActual("viem"),
  createPublicClient: (config: unknown) => mockCreatePublicClient(config),
  http: (...args: [string]) => mockHttp(...args),
}))

jest.mock("@/config/network", () => ({
  TargetChainId: SupportedChainId.Sepolia,
}))

jest.mock("./viem-provider", () => ({
  createViemProvider: (client: unknown) => mockCreateViemProvider(client),
}))

describe("server viem clients", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.WILDCAT_SERVER_RPC_URL_SEPOLIA
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test-key"
  })

  it("creates a native read-only client for the requested chain", () => {
    expect(getViemPublicClientForServer(SupportedChainId.Sepolia)).toBe(
      mockPublicClient,
    )
    expect(mockHttp).toHaveBeenCalledWith(
      "https://eth-sepolia.g.alchemy.com/v2/test-key",
    )
    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expect.objectContaining({ id: SupportedChainId.Sepolia }),
        transport: { url: "https://eth-sepolia.g.alchemy.com/v2/test-key" },
      }),
    )
  })

  it("prefers the server-only RPC override", () => {
    process.env.WILDCAT_SERVER_RPC_URL_SEPOLIA = "https://rpc.example.invalid"

    getViemPublicClientForServer(SupportedChainId.Sepolia)

    expect(mockHttp).toHaveBeenCalledWith("https://rpc.example.invalid")
  })

  it("builds the SDK compatibility provider from the native client", () => {
    expect(getProviderForServer(SupportedChainId.Sepolia)).toBe(
      mockViemProvider,
    )
    expect(mockCreateViemProvider).toHaveBeenCalledWith(mockPublicClient)
  })
})
