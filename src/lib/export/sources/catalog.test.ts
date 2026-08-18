/** @jest-environment node */

import { querySubgraph } from "@/lib/protocol-stats/subgraph"

import { fetchExportMarketCatalog } from "./catalog"

jest.mock("@/lib/protocol-stats/subgraph", () => ({
  querySubgraph: jest.fn(),
}))

const querySubgraphMock = jest.mocked(querySubgraph)

describe("export market catalogue", () => {
  afterEach(() => jest.resetAllMocks())

  it("loads every V2 market using an address cursor", async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({
      id: `0x${(index + 1).toString(16).padStart(40, "0")}`,
      name: `Market ${index + 1}`,
      symbol: `M${index + 1}`,
      borrower: `0x${"a".repeat(40)}`,
      isClosed: false,
      isRegistered: true,
    }))
    querySubgraphMock
      .mockResolvedValueOnce({ markets: firstPage })
      .mockResolvedValueOnce({
        markets: [
          {
            id: `0x${(1_001).toString(16).padStart(40, "0")}`,
            name: "Last market",
            symbol: "LAST",
            borrower: `0x${"b".repeat(40)}`,
            isClosed: true,
            isRegistered: true,
          },
        ],
      })

    const result = await fetchExportMarketCatalog(1)

    expect(result).toHaveLength(1_001)
    expect(result[0]).toEqual({
      address: firstPage[0].id,
      name: "Market 1",
      symbol: "M1",
      borrower: `0x${"a".repeat(40)}`,
      isActive: true,
    })
    expect(querySubgraphMock).toHaveBeenCalledTimes(2)
    expect(querySubgraphMock.mock.calls[0][1]).toContain("version: V2")
    expect(querySubgraphMock.mock.calls[0][1]).toContain("borrower")
    expect(querySubgraphMock.mock.calls[0][1]).toContain("isClosed")
    expect(result.at(-1)?.isActive).toBe(false)
    expect(querySubgraphMock.mock.calls[1][1]).toContain(
      `id_gt: "${firstPage[999].id}"`,
    )
  })
})
