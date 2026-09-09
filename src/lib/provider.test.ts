/**
 * @jest-environment node
 */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { getProviderForServer, getViemPublicClientForServer } from "./provider"

const mockPublicClient = { request: jest.fn() }
const mockCreatePublicClient = jest.fn().mockReturnValue(mockPublicClient)
const mockHttp = jest.fn<{ url: string }, [string, unknown]>((url) => ({ url }))
const mockViemProvider = { request: jest.fn() }
const mockCreateViemProvider = jest.fn().mockReturnValue(mockViemProvider)

jest.mock("viem", () => ({
  ...jest.requireActual("viem"),
  createPublicClient: (config: unknown) => mockCreatePublicClient(config),
  http: (...args: [string, unknown]) => mockHttp(...args),
}))

jest.mock("@/config/network", () => ({
  TargetChainId: SupportedChainId.Sepolia,
}))

jest.mock("./viem-provider", () => ({
  createViemProvider: (client: unknown) => mockCreateViemProvider(client),
}))

describe("server viem clients", () => {
  const originalEnvironment = { ...process.env }

  afterAll(() => {
    process.env = originalEnvironment
  })

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.WILDCAT_SERVER_RPC_URL_SEPOLIA
    process.env.WILDCAT_GATEWAY_TOKEN = "test-gateway-key"
  })

  it("creates a native read-only client for the requested chain", () => {
    expect(getViemPublicClientForServer(SupportedChainId.Sepolia)).toBe(
      mockPublicClient,
    )
    expect(mockHttp).toHaveBeenCalledWith(
      "https://rpc.wildcat.finance/11155111",
      {
        timeout: 30_000,
        fetchOptions: {
          headers: { Authorization: "Bearer test-gateway-key" },
          redirect: "error",
        },
      },
    )
    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: expect.objectContaining({ id: SupportedChainId.Sepolia }),
        transport: { url: "https://rpc.wildcat.finance/11155111" },
      }),
    )
  })

  it("prefers the server-only RPC override", () => {
    process.env.WILDCAT_SERVER_RPC_URL_SEPOLIA = "https://rpc.example.invalid"

    getViemPublicClientForServer(SupportedChainId.Sepolia)

    expect(mockHttp).toHaveBeenCalledWith("https://rpc.example.invalid", {
      timeout: 30_000,
      fetchOptions: { headers: {}, redirect: "error" },
    })
  })

  it("requires a gateway token when using the default provider", () => {
    delete process.env.WILDCAT_GATEWAY_TOKEN
    expect(() => getViemPublicClientForServer()).toThrow(
      "WILDCAT_GATEWAY_TOKEN is missing or invalid",
    )
    expect(mockHttp).not.toHaveBeenCalled()
  })

  it("builds the SDK compatibility provider from the native client", () => {
    expect(getProviderForServer(SupportedChainId.Sepolia)).toBe(
      mockViemProvider,
    )
    expect(mockCreateViemProvider).toHaveBeenCalledWith(mockPublicClient)
  })
})
