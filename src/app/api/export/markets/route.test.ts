/** @jest-environment node */

import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { fetchExportMarketCatalog } from "@/lib/export/sources/catalog"

import { GET } from "./route"

jest.mock("@/lib/db", () => ({
  prisma: { borrower: { findMany: jest.fn() } },
}))
jest.mock("@/lib/export/sources/catalog", () => ({
  fetchExportMarketCatalog: jest.fn(),
}))

const findBorrowersMock = jest.mocked(prisma.borrower.findMany)
const fetchCatalogMock = jest.mocked(fetchExportMarketCatalog)

describe("export market catalogue route", () => {
  afterEach(() => jest.resetAllMocks())

  it("groups active markets by borrower and excludes closed-only borrowers", async () => {
    fetchCatalogMock.mockResolvedValue([
      {
        address: "0x1111111111111111111111111111111111111111",
        name: "Active One",
        symbol: "ONE",
        borrower: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        isActive: true,
      },
      {
        address: "0x2222222222222222222222222222222222222222",
        name: "Active Two",
        symbol: "TWO",
        borrower: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        isActive: true,
      },
      {
        address: "0x3333333333333333333333333333333333333333",
        name: "Closed",
        symbol: "OLD",
        borrower: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        isActive: false,
      },
    ])
    findBorrowersMock.mockResolvedValue([
      {
        address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        name: "Legal Name",
        alias: "Display Name",
      },
      {
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        name: "Closed Borrower",
        alias: null,
      },
    ] as never)

    const response = await GET(
      new NextRequest(
        "http://localhost/api/export/markets?chainId=1&includeBorrowers=true",
      ),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.borrowers).toEqual([
      {
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Display Name",
        marketAddresses: [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
        ],
      },
    ])
    expect(body.markets).toHaveLength(3)
  })

  it("loads the Selected catalogue without touching borrower profiles", async () => {
    fetchCatalogMock.mockResolvedValue([])

    const response = await GET(
      new NextRequest("http://localhost/api/export/markets?chainId=1"),
    )

    expect(response.status).toBe(200)
    expect(findBorrowersMock).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({ markets: [] })
  })

  it("rejects unsupported chains without loading data", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/export/markets?chainId=999"),
    )

    expect(response.status).toBe(400)
    expect(fetchCatalogMock).not.toHaveBeenCalled()
  })
})
