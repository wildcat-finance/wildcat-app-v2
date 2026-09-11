const createSubgraphClient = jest.fn((chainId: number, endpoint?: string) => ({
  chainId,
  endpoint,
}))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  SubgraphUrls: {
    11155111: "https://goldsky/sepolia",
    1: "https://goldsky/mainnet",
  },
  SupportedChainId: {
    Sepolia: 11155111,
    Mainnet: 1,
    PlasmaTestnet: 9746,
    PlasmaMainnet: 9745,
  },
  createSubgraphClient: (c: number, e?: string) => createSubgraphClient(c, e),
}))

describe("getBrowserSubgraphClient", () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
    jest.resetModules()
    createSubgraphClient.mockClear()
  })

  it("uses the SDK URL when no override is set", () => {
    delete process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { getBrowserSubgraphClient } = require("./client")
      expect(getBrowserSubgraphClient(11155111)).toEqual({
        chainId: 11155111,
        endpoint: "https://goldsky/sepolia",
      })
    })
  })

  it("uses NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA and memoises per chain", () => {
    process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA =
      "http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork"
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { getBrowserSubgraphClient } = require("./client")
      const a = getBrowserSubgraphClient(11155111)
      const b = getBrowserSubgraphClient(11155111)
      expect(a.endpoint).toBe(
        "http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork",
      )
      expect(a).toBe(b)
      expect(createSubgraphClient).toHaveBeenCalledTimes(1)
      expect(getBrowserSubgraphClient(1).endpoint).toBe(
        "https://goldsky/mainnet",
      )
    })
  })
})

export {}
