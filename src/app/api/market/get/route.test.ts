/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

const mockQuery = jest.fn()
const mockUnstableCache = jest.fn(
  (fn: () => unknown, ..._args: unknown[]) => fn,
)

jest.mock("@apollo/client", () => ({ gql: jest.fn(() => ({})) }))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getSubgraphClient: jest.fn(() => ({ query: mockQuery })),
  SubgraphUrls: {
    11155111: "https://example.invalid/subgraph",
  },
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
        "marketGet:v4",
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

  it("rejects an unsupported supplied chain instead of cross-chain discovery", async () => {
    const { GET } = await import("./route")

    const response = await GET(
      mockGet(
        "/api/market/get?address=0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90&chainId=999",
      ),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Unsupported chain ID" })
    expect(mockQuery).not.toHaveBeenCalled()
  })
})
