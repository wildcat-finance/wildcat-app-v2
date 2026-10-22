/** @jest-environment node */
import { ServiceAgreementParty } from "@prisma/client"

import { prisma } from "@/lib/db"

import { getServiceAgreementGateStatus } from "./serviceAgreement"

jest.mock("@/lib/db", () => ({
  prisma: {
    serviceAgreement: { findFirst: jest.fn() },
    serviceAgreementSignature: { findMany: jest.fn() },
    serviceAgreementRefusal: { findUnique: jest.fn() },
  },
}))
jest.mock("@/lib/provider", () => ({ getProviderForServer: jest.fn() }))
jest.mock("@/lib/signatures", () => ({
  verifyAndDescribeSignature: jest.fn(),
}))

const now = new Date("2026-10-15T00:00:00Z")
const account = "0xaBcD"
const current = {
  id: 5,
  version: "tou-2026-10-15",
  plaintext: "Updated terms",
  html: "<p>Updated terms</p>",
  plaintextSha256: "current-hash",
  legacyWrapperHash: null,
  acknowledgementText: "I accept the updated terms.",
  effectiveDate: now,
  isCurrent: true,
  reacceptanceDeadline: null as Date | null,
  createdAt: now,
}
const previous = { ...current, id: 4, version: "previous", isCurrent: false }

const acceptance = (agreement: typeof current) => ({
  id: agreement.id,
  chainId: 1,
  address: account.toLowerCase(),
  signer: account.toLowerCase(),
  party: ServiceAgreementParty.Lender,
  serviceAgreementId: agreement.id,
  signature: "0xsignature",
  kind: null,
  blockNumber: null,
  timeSigned: now,
  organizationName: null,
  signedMessage: "Signed terms",
  createdAt: now,
  serviceAgreement: agreement,
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(now)
  jest.mocked(prisma.serviceAgreement.findFirst).mockResolvedValue(current)
  jest.mocked(prisma.serviceAgreementSignature.findMany).mockResolvedValue([])
  jest.mocked(prisma.serviceAgreementRefusal.findUnique).mockResolvedValue(null)
})

afterEach(() => jest.useRealTimers())

it.each([ServiceAgreementParty.Lender, ServiceAgreementParty.Borrower])(
  "scopes %s history and the current refusal to the chain and account",
  async (party) => {
    const status = await getServiceAgreementGateStatus(1, account, party)
    expect(status.state).toBe("neverSigned")
    expect(status.hasAnyAcceptance).toBe(false)
    expect(status.acceptedVersion).toBeNull()
    expect(prisma.serviceAgreementSignature.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chainId: 1, address: account.toLowerCase(), party },
        orderBy: { serviceAgreementId: "desc" },
      }),
    )
    expect(prisma.serviceAgreementRefusal.findUnique).toHaveBeenCalledWith({
      where: {
        chainId_address_party_serviceAgreementId: {
          chainId: 1,
          address: account.toLowerCase(),
          party,
          serviceAgreementId: current.id,
        },
      },
      select: { timeSigned: true },
    })
  },
)

it.each([
  [null, "stale"],
  [new Date("2026-10-16T00:00:00Z"), "staleWithinGrace"],
  [now, "staleExpired"],
] as const)(
  "applies campaign deadline %s to prior acceptances",
  async (deadline, state) => {
    jest.mocked(prisma.serviceAgreement.findFirst).mockResolvedValue({
      ...current,
      reacceptanceDeadline: deadline,
    })
    jest
      .mocked(prisma.serviceAgreementSignature.findMany)
      .mockResolvedValue([acceptance(previous)])
    const status = await getServiceAgreementGateStatus(1, account, "Lender")
    expect(status.state).toBe(state)
    expect(status.hasAnyAcceptance).toBe(true)
    expect(status.acceptedVersion?.version).toBe(previous.version)
  },
)

it("keeps current acceptance final even with a recorded refusal", async () => {
  jest
    .mocked(prisma.serviceAgreementSignature.findMany)
    .mockResolvedValue([acceptance(current), acceptance(previous)])
  jest.mocked(prisma.serviceAgreementRefusal.findUnique).mockResolvedValue({
    ...acceptance(current),
    kind: "ECDSA",
    reason: "Previously declined",
  })
  const status = await getServiceAgreementGateStatus(1, account, "Lender")
  expect(status.state).toBe("signedCurrent")
  expect(status.acceptedVersion?.version).toBe(current.version)
})

it("blocks a current refusal without a current acceptance", async () => {
  jest.mocked(prisma.serviceAgreementRefusal.findUnique).mockResolvedValue({
    ...acceptance(current),
    kind: "ECDSA",
    reason: null,
  })
  const status = await getServiceAgreementGateStatus(1, account, "Lender")
  expect(status.state).toBe("declined")
  expect(status.hasAnyAcceptance).toBe(false)
})
