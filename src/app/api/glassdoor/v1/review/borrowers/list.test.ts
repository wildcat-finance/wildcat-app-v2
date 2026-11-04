/** @jest-environment node */

import type { PrismaClient } from "@prisma/client"

import { listReviewBorrowers } from "./list"

// Temporary: the metric review page (product#917). Remove with the page.

const market = (address: string, symbol: string, status: string) => ({
  chainId: 1,
  entityAddress: address,
  values: { M01: symbol, M77: status, MARKET_NAME: ` ${symbol} name ` },
  flags: { borrower: "0xB0" },
})

const database = {
  glassDoorPublication: {
    findFirst: async () => ({
      id: "p1",
      publishedAt: new Date("2026-10-29T10:00:00Z"),
    }),
  },
  glassDoorMetricSnapshot: {
    findMany: async ({ where }: { where: { entityKind: string } }) =>
      where.entityKind === "Market"
        ? [
            market("0x03", "zzOpen", "Open"),
            market("0x01", "aaClosed", "Closed"),
            market("0x02", "bbOpen", "Open"),
          ]
        : [{ chainId: 1, entityAddress: "0xb0", flags: { state: "Ok" } }],
  },
  borrower: {
    findMany: async () => [
      { chainId: 1, address: "0xB0", name: "  Example  ", alias: null },
    ],
  },
} as unknown as PrismaClient

describe("review borrower list", () => {
  it("lists open markets first, then by symbol, with trimmed names", async () => {
    const list = await listReviewBorrowers(database)
    expect(list.borrowers).toHaveLength(1)
    const [borrower] = list.borrowers
    expect(borrower).toMatchObject({
      address: "0xb0",
      name: "Example",
      state: "Ok",
    })
    expect(borrower.markets.map((row) => row.symbol)).toEqual([
      "bbOpen",
      "zzOpen",
      "aaClosed",
    ])
    expect(borrower.markets[0].name).toBe("bbOpen name")
  })
})
