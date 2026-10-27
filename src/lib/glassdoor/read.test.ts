/** @jest-environment node */

import type { PrismaClient } from "@prisma/client"
import { NextRequest } from "next/server"

import { readBorrower, readMarket } from "./read"
import { respond } from "./respond"

const MARKET = `0x${"a".repeat(40)}`
const OTHER_MARKET = `0x${"c".repeat(40)}`
const BORROWER = `0x${"b".repeat(40)}`
const publication = {
  id: "pub-1",
  kind: "Intraday",
  status: "Current",
  day: null,
  publishedAt: new Date("2026-10-20T00:00:00Z"),
  registryVersion: "cheat-sheet-v4",
  cuts: { "1": { block: 100, hash: "0xabc", timestamp: 1_700_000_000 } },
}
const marketRow = (address: string, values: Record<string, unknown>) => ({
  entityKind: "Market",
  chainId: 1,
  entityAddress: address,
  values,
  flags: {
    state: "Ok",
    borrower: BORROWER,
    comparisons: { M18: { median: 97.5, population: 62, betterThan: 9 } },
    protocol: { markets: 63, openMarkets: 62, lateNow: 6 },
  },
})

const database = (
  options: { publication?: boolean; marketStatus?: boolean } = {},
) =>
  ({
    glassDoorPublication: {
      findFirst: async () =>
        options.publication === false ? null : publication,
    },
    glassDoorMarketStatus: {
      findUnique: async () =>
        options.marketStatus ? { state: "Preparing" } : null,
    },
    glassDoorMetricSnapshot: {
      findUnique: async ({
        where,
      }: {
        where: Record<string, { entityKind: string; entityAddress: string }>
      }) => {
        const key = where.publicationId_entityKind_chainId_entityAddress
        if (key.entityKind === "Market" && key.entityAddress === MARKET) {
          return marketRow(MARKET, {
            M01: "wmtUSDC",
            MARKET_NAME: "Wintermute Trading USD Coin",
            M18: 82.6,
          })
        }
        if (key.entityKind === "Borrower" && key.entityAddress === BORROWER) {
          return { values: { S05: 91.7 }, flags: { partial: false } }
        }
        return null
      },
      findMany: async () => [
        marketRow(MARKET, { M01: "wmtUSDC", M18: 82.6, M32: 83 }),
        marketRow(OTHER_MARKET, { M01: "wmtUSDT", M18: 89.6 }),
      ],
    },
  }) as unknown as PrismaClient

const request = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/glassdoor", { headers })

describe("Glass Door read API", () => {
  it("serves a market from the current publication with its block", async () => {
    const response = await respond(request(), "1", MARKET, (chainId, address) =>
      readMarket(database(), chainId, address),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("etag")).toBe('"pub-1"')
    expect(response.headers.get("cache-control")).toContain("s-maxage=60")
    const body = await response.json()
    expect(body.publication.cut.block).toBe(100)
    expect(body.values.M18).toBe(82.6)
    expect(body.market).toMatchObject({
      name: "Wintermute Trading USD Coin",
      symbol: "wmtUSDC",
    })
    expect(body.state).toBe("Ok")
    expect(body.comparisons.M18).toEqual({
      median: 97.5,
      population: 62,
      betterThan: 9,
    })
    expect(body.protocol.lateNow).toBe(6)
    expect(body.flags.comparisons).toBeUndefined()
  })

  it("answers an unchanged publication with 304", async () => {
    const response = await respond(
      request({ "if-none-match": '"pub-1"' }),
      "1",
      MARKET,
      (chainId, address) => readMarket(database(), chainId, address),
    )
    expect(response.status).toBe(304)
  })

  it("says a known market is being prepared before its first publication", async () => {
    const response = await respond(
      request(),
      "1",
      OTHER_MARKET,
      (chainId, address) =>
        readMarket(database({ marketStatus: true }), chainId, address),
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ state: "Preparing" })
  })

  it("serves a borrower with the per-market table from the same publication", async () => {
    const response = await respond(
      request(),
      "1",
      BORROWER,
      (chainId, address) => readBorrower(database(), chainId, address),
    )
    const body = await response.json()
    expect(body.values.S05).toBe(91.7)
    expect(body.markets).toHaveLength(2)
    expect(body.markets[0]).toMatchObject({
      symbol: "wmtUSDC",
      values: { M18: 82.6, M32: 83, M30: null },
    })
  })

  it("rejects unsupported chains and malformed addresses", async () => {
    const read = (chainId: number, address: string) =>
      readMarket(database(), chainId, address)
    expect((await respond(request(), "5", MARKET, read)).status).toBe(400)
    expect((await respond(request(), "1", "0x123", read)).status).toBe(400)
  })
})
