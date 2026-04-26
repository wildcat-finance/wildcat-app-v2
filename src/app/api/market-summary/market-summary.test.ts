/**
 * @jest-environment node
 */

import { wildcatMarketAbi } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"
import { encodeFunctionResult } from "viem"

import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"

import { GET, HEAD, POST } from "./[market]/route"
import { verifyApiToken } from "../auth/verify-header"

jest.mock("@/config/network", () => ({
  TargetChainId: 11155111,
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    marketDescription: {
      findFirst: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(),
}))

jest.mock("../auth/verify-header", () => ({
  verifyApiToken: jest.fn(),
}))

const mockGet = (path: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "GET",
  })

const mockHead = (path: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "HEAD",
  })

const mockPost = (path: string, body: unknown): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  })

const marketDescription = prisma.marketDescription as unknown as {
  findFirst: jest.Mock
  count: jest.Mock
  upsert: jest.Mock
}

describe("/api/market-summary/[market]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns an empty summary when no optional market description exists", async () => {
    marketDescription.findFirst.mockResolvedValue(null)

    const response = await GET(
      mockGet(
        "/api/market-summary/0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90?chainId=11155111",
      ),
      {
        params: {
          market: "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
        },
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ description: "" })
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60")
  })

  it("sets a positive cache header when a market description exists", async () => {
    marketDescription.findFirst.mockResolvedValue({
      description: "Live market description",
    })

    const response = await GET(
      mockGet(
        "/api/market-summary/0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90?chainId=11155111",
      ),
      {
        params: {
          market: "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
        },
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      description: "Live market description",
    })
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300")
  })

  it("writes summaries under the validated request chain ID", async () => {
    const market = "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90"
    const borrower = "0xca732651410e915090d7a7d889a1e44ef4575fce"
    ;(verifyApiToken as jest.Mock).mockResolvedValue({ address: borrower })
    ;(getProviderForServer as jest.Mock).mockReturnValue({
      call: jest.fn().mockResolvedValue(
        encodeFunctionResult({
          abi: wildcatMarketAbi,
          functionName: "borrower",
          result: borrower,
        }),
      ),
    })
    marketDescription.upsert.mockResolvedValue({})

    const response = await POST(
      mockPost(`/api/market-summary/${market}?chainId=9746`, {
        description: "Test description",
      }),
      {
        params: { market },
      },
    )

    expect(response.status).toBe(200)
    expect(marketDescription.upsert).toHaveBeenCalledWith({
      where: {
        chainId_marketAddress: {
          chainId: 9746,
          marketAddress: market,
        },
      },
      create: {
        chainId: 9746,
        marketAddress: market,
        description: "Test description",
      },
      update: {
        description: "Test description",
      },
    })
  })

  it("uses short cache headers for HEAD misses", async () => {
    marketDescription.count.mockResolvedValue(0)

    const response = await HEAD(
      mockHead(
        "/api/market-summary/0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90?chainId=11155111",
      ),
      {
        params: {
          market: "0x04fb4e4577ad2cdd65e70f18d7a5f326162ddd90",
        },
      },
    )

    expect(response.status).toBe(404)
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60")
  })
})
