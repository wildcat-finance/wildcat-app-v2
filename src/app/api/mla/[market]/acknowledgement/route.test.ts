/**
 * @jest-environment node
 */

import { wildcatMarketAbi } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"
import { getAddress } from "viem"

import { NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION } from "@/config/non-mla-acknowledgement"
import {
  getBorrowerProfile,
  getSignedMasterLoanAgreement,
  prisma,
} from "@/lib/db"
import {
  getProviderForServer,
  getViemPublicClientForServer,
} from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"

import { GET, POST } from "./route"

jest.mock("@/lib/db", () => ({
  getBorrowerProfile: jest.fn(),
  getSignedMasterLoanAgreement: jest.fn(),
  prisma: {
    nonMlaAcknowledgement: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    refusalToAssignMla: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(),
  getViemPublicClientForServer: jest.fn(),
}))

jest.mock("@/lib/signatures", () => ({
  verifyAndDescribeSignature: jest.fn(),
}))

const market = "0x2222222222222222222222222222222222222222"
const lender = "0x1111111111111111111111111111111111111111"
const borrower = "0x3333333333333333333333333333333333333333"
const signature = `0x${"11".repeat(65)}`

const mockFindLenderAcknowledgement = prisma.nonMlaAcknowledgement
  .findFirst as jest.Mock
const mockFindAcknowledgement = prisma.nonMlaAcknowledgement
  .findUnique as jest.Mock
const mockUpsertAcknowledgement = prisma.nonMlaAcknowledgement
  .upsert as jest.Mock
const mockFindRefusal = prisma.refusalToAssignMla.findFirst as jest.Mock
const mockGetMla = getSignedMasterLoanAgreement as jest.Mock
const mockGetProfile = getBorrowerProfile as jest.Mock
const mockGetProvider = getProviderForServer as jest.Mock
const mockGetPublicClient = getViemPublicClientForServer as jest.Mock
const mockVerifySignature = verifyAndDescribeSignature as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

test("returns a successful null response before the lender acknowledges", async () => {
  mockFindLenderAcknowledgement.mockResolvedValue(null)

  const response = await GET(
    new NextRequest(
      `http://localhost/api/mla/${market}/acknowledgement?chainId=11155111&lenderAddress=${lender}`,
    ),
    { params: { market } },
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toBeNull()
  expect(mockFindLenderAcknowledgement).toHaveBeenCalledWith({
    where: {
      chainId: 11155111,
      market,
      address: lender,
      acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
    },
  })
})

test("returns the existing lender acknowledgement", async () => {
  mockFindLenderAcknowledgement.mockResolvedValue({
    chainId: 11155111,
    market,
    address: lender,
    signer: lender,
    signature,
    kind: "ECDSA",
    blockNumber: null,
    acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
    acknowledgementText: "acknowledgement",
    timeSigned: new Date("2026-07-29T12:00:00.000Z"),
    createdAt: new Date("2026-07-29T12:00:00.000Z"),
  })

  const response = await GET(
    new NextRequest(
      `http://localhost/api/mla/${market}/acknowledgement?chainId=11155111&lenderAddress=${lender}`,
    ),
    { params: { market } },
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(
    expect.objectContaining({
      chainId: 11155111,
      market,
      address: lender,
      signature,
      acknowledgementTextVersion: NON_MLA_ACKNOWLEDGEMENT_TEXT_VERSION,
    }),
  )
})

test("reads market name through the native viem client and public SDK ABI", async () => {
  const readContract = jest.fn().mockResolvedValue("Test Market")
  const signatureProvider = { call: jest.fn() }
  mockFindAcknowledgement.mockResolvedValue(null)
  mockGetMla.mockResolvedValue(undefined)
  mockFindRefusal.mockResolvedValue({ address: borrower })
  mockGetProfile.mockResolvedValue({
    address: borrower,
    chainId: 11155111,
    name: "Example Borrower LLC",
    alias: "Example",
    registeredOnChain: true,
  })
  mockGetPublicClient.mockReturnValue({ readContract })
  mockGetProvider.mockReturnValue(signatureProvider)
  mockVerifySignature.mockResolvedValue({
    kind: "ECDSA",
    address: lender,
    signature,
  })
  mockUpsertAcknowledgement.mockResolvedValue({
    chainId: 11155111,
    market,
    address: lender,
    signer: lender,
    signature,
    kind: "ECDSA",
    blockNumber: null,
    acknowledgementTextVersion: "v1",
    acknowledgementText: "acknowledgement",
  })

  const response = await POST(
    new NextRequest(`http://localhost/api/mla/${market}/acknowledgement`, {
      method: "POST",
      body: JSON.stringify({
        address: lender,
        chainId: 11155111,
        signature,
      }),
    }),
    { params: { market } },
  )

  expect(response.status).toBe(200)
  expect(mockGetPublicClient).toHaveBeenCalledWith(11155111)
  expect(readContract).toHaveBeenCalledWith({
    address: getAddress(market),
    abi: wildcatMarketAbi,
    functionName: "name",
  })
  expect(mockVerifySignature).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: signatureProvider,
      address: lender,
      signature,
    }),
  )
})
