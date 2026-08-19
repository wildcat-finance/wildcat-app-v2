/**
 * @jest-environment node
 */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"

import {
  findBorrowerWithPendingInvitation,
  getBorrowerAcceptanceTimes,
  prisma,
} from "@/lib/db"
import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
  saveServiceAgreementSignature,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"

import { POST } from "./route"

jest.mock("@/lib/db", () => ({
  findBorrowerWithPendingInvitation: jest.fn(),
  getBorrowerAcceptanceTimes: jest.fn(),
  prisma: {
    borrower: {
      findFirst: jest.fn(),
    },
    serviceAgreementSignature: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/serviceAgreement", () => ({
  getCurrentServiceAgreement: jest.fn(),
  isServiceAgreementTimeSignedInBounds: jest.fn(),
  saveServiceAgreementSignature: jest.fn(),
  verifyServiceAgreementSignature: jest.fn(),
}))

const address = "0x1111111111111111111111111111111111111111"
const signature = `0x${"11".repeat(65)}`
const timeSigned = Date.UTC(2026, 6, 28)
const agreement = {
  id: 42,
  acknowledgementText: "I accept",
}

const mockGetCurrentAgreement = getCurrentServiceAgreement as jest.Mock
const mockTimeInBounds = isServiceAgreementTimeSignedInBounds as jest.Mock
const mockSaveSignature = saveServiceAgreementSignature as jest.Mock
const mockVerifySignature = verifyServiceAgreementSignature as jest.Mock
const mockFindBorrower = prisma.borrower.findFirst as jest.Mock
const mockFindCurrentAcceptance = prisma.serviceAgreementSignature
  .findUnique as jest.Mock
const mockGetBorrowerAcceptanceTimes = getBorrowerAcceptanceTimes as jest.Mock
const mockFindPendingInvitation = findBorrowerWithPendingInvitation as jest.Mock

const request = (party: "Borrower" | "Lender") =>
  new NextRequest("http://localhost/api/service-agreement/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: address.toUpperCase(),
      chainId: SupportedChainId.Sepolia,
      signature,
      timeSigned,
      party,
    }),
  })

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCurrentAgreement.mockResolvedValue(agreement)
  mockTimeInBounds.mockReturnValue(true)
  mockFindCurrentAcceptance.mockResolvedValue(null)
  mockGetBorrowerAcceptanceTimes.mockResolvedValue(new Map())
  mockFindPendingInvitation.mockResolvedValue(undefined)
  mockFindBorrower.mockResolvedValue({ name: "Example Borrower LLC" })
  mockVerifySignature.mockResolvedValue({ id: "verified" })
})

describe("POST /api/service-agreement/accept", () => {
  it("preserves exact-retry idempotency before applying the onboarding guard", async () => {
    mockFindCurrentAcceptance.mockResolvedValue({
      signature,
      timeSigned: new Date(timeSigned),
    })
    mockTimeInBounds.mockReturnValue(false)

    const response = await POST(request("Borrower"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mockGetBorrowerAcceptanceTimes).not.toHaveBeenCalled()
    expect(mockTimeInBounds).not.toHaveBeenCalled()
    expect(mockVerifySignature).not.toHaveBeenCalled()
    expect(mockSaveSignature).not.toHaveBeenCalled()
  })

  it("sends a borrower with a waiting invitation back to that flow", async () => {
    mockFindPendingInvitation.mockResolvedValue({ id: 7 })

    const response = await POST(request("Borrower"))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error:
        "Initial borrower acceptance must be completed through the invitation flow",
    })
    expect(mockGetBorrowerAcceptanceTimes).toHaveBeenCalledWith(
      SupportedChainId.Sepolia,
      [address],
    )
    expect(mockTimeInBounds).not.toHaveBeenCalled()
    expect(mockVerifySignature).not.toHaveBeenCalled()
    expect(mockSaveSignature).not.toHaveBeenCalled()
  })

  it("accepts a first borrower signature when no invitation is waiting", async () => {
    const response = await POST(request("Borrower"))

    expect(response.status).toBe(200)
    expect(mockFindPendingInvitation).toHaveBeenCalledWith(
      address,
      SupportedChainId.Sepolia,
    )
    expect(mockVerifySignature).toHaveBeenCalledWith({
      agreement,
      chainId: SupportedChainId.Sepolia,
      address,
      party: "Borrower",
      signature,
      timeSigned,
      organizationName: "Example Borrower LLC",
    })
    expect(mockSaveSignature).toHaveBeenCalledWith({ id: "verified" })
  })

  it("does not look up an invitation for a borrower who already signed", async () => {
    mockGetBorrowerAcceptanceTimes.mockResolvedValue(
      new Map([[address, new Date(timeSigned - 1)]]),
    )

    await POST(request("Borrower"))

    expect(mockFindPendingInvitation).not.toHaveBeenCalled()
  })

  it("allows a recognized versioned or seeded-legacy acceptance to re-accept", async () => {
    mockGetBorrowerAcceptanceTimes.mockResolvedValue(
      new Map([[address, new Date(timeSigned - 1)]]),
    )

    const response = await POST(request("Borrower"))

    expect(response.status).toBe(200)
    expect(mockTimeInBounds).toHaveBeenCalledWith(timeSigned)
    expect(mockVerifySignature).toHaveBeenCalledWith({
      agreement,
      chainId: SupportedChainId.Sepolia,
      address,
      party: "Borrower",
      signature,
      timeSigned,
      organizationName: "Example Borrower LLC",
    })
    expect(mockSaveSignature).toHaveBeenCalledWith({ id: "verified" })
  })

  it("does not change first-time lender acceptance", async () => {
    const response = await POST(request("Lender"))

    expect(response.status).toBe(200)
    expect(mockGetBorrowerAcceptanceTimes).not.toHaveBeenCalled()
    expect(mockFindBorrower).not.toHaveBeenCalled()
    expect(mockVerifySignature).toHaveBeenCalledWith({
      agreement,
      chainId: SupportedChainId.Sepolia,
      address,
      party: "Lender",
      signature,
      timeSigned,
      organizationName: undefined,
    })
    expect(mockSaveSignature).toHaveBeenCalledWith({ id: "verified" })
  })
})
