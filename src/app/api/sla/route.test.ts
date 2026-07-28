/**
 * @jest-environment node
 */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"

import { POST } from "./route"

jest.mock("@/lib/db", () => ({
  prisma: {
    serviceAgreementSignature: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/serviceAgreement", () => ({
  getCurrentServiceAgreement: jest.fn(),
  isServiceAgreementTimeSignedInBounds: jest.fn(),
  requireLegacyWrapperHash: jest.fn(),
  saveServiceAgreementSignature: jest.fn(),
  verifyServiceAgreementSignature: jest.fn(),
}))

const address = "0x1111111111111111111111111111111111111111"
const signature = `0x${"11".repeat(65)}`

const mockGetCurrentAgreement = getCurrentServiceAgreement as jest.Mock
const mockTimeInBounds = isServiceAgreementTimeSignedInBounds as jest.Mock
const mockVerifySignature = verifyServiceAgreementSignature as jest.Mock
const mockFindSignature = prisma.serviceAgreementSignature
  .findUnique as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCurrentAgreement.mockResolvedValue({ id: 42 })
})

describe("POST /api/sla", () => {
  test("accepts an exact persisted retry after its signing window expires", async () => {
    const timeSigned = Date.UTC(2026, 0, 1)
    mockFindSignature.mockResolvedValue({
      signature,
      timeSigned: new Date(timeSigned),
    })
    mockTimeInBounds.mockReturnValue(false)

    const response = await POST(
      new NextRequest("http://localhost/api/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.toUpperCase(),
          chainId: SupportedChainId.Sepolia,
          signature,
          timeSigned,
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mockFindSignature).toHaveBeenCalledWith({
      where: {
        chainId_address_party_serviceAgreementId: {
          chainId: SupportedChainId.Sepolia,
          address,
          party: "Lender",
          serviceAgreementId: 42,
        },
      },
    })
    expect(mockTimeInBounds).not.toHaveBeenCalled()
    expect(mockVerifySignature).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
