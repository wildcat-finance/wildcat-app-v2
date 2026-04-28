/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

const mockQuery = jest.fn()
const mockUnstableCache = jest.fn((fn: () => unknown) => fn)

jest.mock("@apollo/client", () => ({
  ApolloClient: jest.fn().mockImplementation(() => ({ query: mockQuery })),
  HttpLink: jest.fn(),
  InMemoryCache: jest.fn(),
}))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  SubgraphUrls: {
    11155111: "https://example.invalid/subgraph",
  },
}))

jest.mock("@wildcatfi/wildcat-sdk/dist/gql/graphql", () => ({
  GetMarketDocument: {},
}))

jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, ...args: unknown[]) =>
    mockUnstableCache(fn, ...args),
}))

const mockGet = (path: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "GET",
  })

describe("/api/market/get", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("uses a short public cache header for subgraph-lag misses", async () => {
    mockQuery.mockResolvedValue({ data: { market: null } })
    const { GET } = await import("./route")

    const response = await GET(
      mockGet(
        "/api/market/get?address=0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90&chainId=11155111",
      ),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ chainId: null, market: null })
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60")
    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      [
        "marketGet:v3",
        "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
        "11155111",
        "11155111",
      ],
      { revalidate: 60 },
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {},
        variables: {
          market: "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
          shouldSkipRecords: true,
        },
        fetchPolicy: "network-only",
      }),
    )
  })

  it("uses a longer public cache header for discovered markets", async () => {
    const market = { id: "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90" }
    mockQuery.mockResolvedValue({ data: { market } })
    const { GET } = await import("./route")

    const response = await GET(
      mockGet(
        "/api/market/get?address=0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90&chainId=11155111",
      ),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ chainId: 11155111, market })
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400")
  })
})
