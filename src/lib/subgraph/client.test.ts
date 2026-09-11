const apolloClient = jest.fn(function ApolloClientMock(
  this: { uri?: string },
  options: { uri?: string },
) {
  this.uri = options.uri
})

jest.mock("@apollo/client", () => ({
  ApolloClient: function ApolloClient(
    this: unknown,
    options: { uri?: string },
  ) {
    return (apolloClient as unknown as (o: unknown) => void).call(this, options)
  },
  InMemoryCache: function InMemoryCache() {},
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
}))

describe("getBrowserSubgraphClient", () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
    jest.resetModules()
    apolloClient.mockClear()
  })

  it("uses the SDK URL when no override is set", () => {
    delete process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { getBrowserSubgraphClient } = require("./client")
      expect(getBrowserSubgraphClient(11155111).uri).toBe(
        "https://goldsky/sepolia",
      )
    })
  })

  it("uses NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA and memoises per chain", () => {
    process.env.NEXT_PUBLIC_SUBGRAPH_URL_SEPOLIA =
      "http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork-v218"
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { getBrowserSubgraphClient } = require("./client")
      const a = getBrowserSubgraphClient(11155111)
      const b = getBrowserSubgraphClient(11155111)
      expect(a.uri).toBe(
        "http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork-v218",
      )
      expect(a).toBe(b)
      expect(apolloClient).toHaveBeenCalledTimes(1)
      expect(getBrowserSubgraphClient(1).uri).toBe("https://goldsky/mainnet")
    })
  })
})

export {}
