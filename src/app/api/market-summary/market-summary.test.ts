/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"

import { GET } from "./[market]/route"

jest.mock("@/config/network", () => ({
  TargetChainId: 11155111,
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    marketDescription: {
      findFirst: jest.fn(),
    },
  },
}))

const mockGet = (path: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "GET",
  })

const marketDescription = prisma.marketDescription as unknown as {
  findFirst: jest.Mock
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
  })
})
