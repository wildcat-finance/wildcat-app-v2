/**
 * @jest-environment node
 */

import { createHash } from "crypto"

import JSZip from "jszip"
import { NextRequest } from "next/server"

import { getLatestBorrowerAcceptance } from "@/lib/serviceAgreement"

import { GET } from "./route"

jest.mock("@/lib/serviceAgreement", () => ({
  getLatestBorrowerAcceptance: jest.fn(),
}))

const mockGetLatestAcceptance = getLatestBorrowerAcceptance as jest.Mock
const address = "0x1111111111111111111111111111111111111111"

const makeAcceptance = (plaintext: string, plaintextSha256: string) =>
  ({
    address,
    chainId: 11155111,
    organizationName: "Example Borrower",
    timeSigned: new Date("2025-02-13T00:00:00.000Z"),
    createdAt: new Date("2025-02-13T00:00:01.000Z"),
    kind: "ECDSA",
    signature: "0x1234",
    signedMessage: "signed message",
    serviceAgreement: {
      version: "test-version",
      plaintext,
      plaintextSha256,
      legacyWrapperHash: "0x1234",
      acknowledgementText: "acknowledgement",
      effectiveDate: new Date("2025-02-12T00:00:00.000Z"),
    },
  }) as Awaited<ReturnType<typeof getLatestBorrowerAcceptance>>

const getZip = async () => {
  const response = await GET(
    new NextRequest(
      `http://localhost/api/service-agreement/${address}/certificate?chainId=11155111`,
    ),
    { params: { address } },
  )
  expect(response.status).toBe(200)
  return JSZip.loadAsync(await response.arrayBuffer())
}

beforeEach(() => {
  mockGetLatestAcceptance.mockReset()
})

describe("service-agreement acceptance certificate", () => {
  test("includes and identifies verifiable accepted text", async () => {
    const plaintext = "Exact accepted terms"
    const plaintextSha256 = createHash("sha256").update(plaintext).digest("hex")
    mockGetLatestAcceptance.mockResolvedValue(
      makeAcceptance(plaintext, plaintextSha256),
    )

    const zip = await getZip()
    expect(await zip.file("Accepted Terms of Use.txt")?.async("string")).toBe(
      plaintext,
    )
    expect(zip.file("Legacy Terms of Use Placeholder.txt")).toBeNull()

    const record = JSON.parse(
      (await zip.file("acceptance-record.json")?.async("string")) ?? "{}",
    )
    expect(record).toMatchObject({
      plaintextSha256,
      storedPlaintextSha256: plaintextSha256,
      acceptedTermsTextAvailable: true,
    })
  })

  test("does not present a legacy placeholder as exact historical text", async () => {
    const plaintext = "Legacy"
    const declaredHistoricalHash = "48a56e9e"
    mockGetLatestAcceptance.mockResolvedValue(
      makeAcceptance(plaintext, declaredHistoricalHash),
    )

    const zip = await getZip()
    expect(zip.file("Accepted Terms of Use.txt")).toBeNull()
    expect(
      await zip.file("Legacy Terms of Use Placeholder.txt")?.async("string"),
    ).toBe(plaintext)

    const readme = await zip.file("README.txt")?.async("string")
    expect(readme).toContain("not the exact historical text")
    expect(readme).toContain("intentionally do not match")

    const record = JSON.parse(
      (await zip.file("acceptance-record.json")?.async("string")) ?? "{}",
    )
    expect(record).toMatchObject({
      plaintextSha256: declaredHistoricalHash,
      acceptedTermsTextAvailable: false,
    })
    expect(record.storedPlaintextSha256).not.toBe(declaredHistoricalHash)
  })
})
