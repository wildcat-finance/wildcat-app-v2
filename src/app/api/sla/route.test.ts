/** @jest-environment node */
import { NextRequest } from "next/server"

import {
  getCurrentServiceAgreement,
  isServiceAgreementTimeSignedInBounds,
  saveServiceAgreementSignature,
  verifyServiceAgreementSignature,
} from "@/lib/serviceAgreement"

import { POST } from "./route"

jest.mock("@/lib/serviceAgreement", () => ({
  getCurrentServiceAgreement: jest.fn(),
  isServiceAgreementTimeSignedInBounds: jest.fn(),
  saveServiceAgreementSignature: jest.fn(),
  verifyServiceAgreementSignature: jest.fn(),
}))

it("accepts new terms without a legacy wrapper hash", async () => {
  const address = "0x1234567890123456789012345678901234567890"
  const timeSigned = Date.now()
  jest.mocked(getCurrentServiceAgreement).mockResolvedValue({
    id: 5,
    version: "tou-2026-10-15",
    plaintextSha256: "new-hash",
    legacyWrapperHash: null,
    acknowledgementText: "I accept the new terms.",
    effectiveDate: new Date(timeSigned),
    isCurrent: true,
    reacceptanceDeadline: null,
  })
  const verified = {
    chainId: 1,
    address,
    signer: address,
    party: "Lender" as const,
    serviceAgreementId: 5,
    signature: "0x1234",
    kind: "ECDSA" as const,
    blockNumber: null,
    timeSigned: new Date(timeSigned),
    organizationName: null,
    signedMessage: "I accept the new terms.",
  }
  jest.mocked(isServiceAgreementTimeSignedInBounds).mockReturnValue(true)
  jest.mocked(verifyServiceAgreementSignature).mockResolvedValue(verified)
  const response = await POST(
    new NextRequest("http://localhost:3000/api/sla", {
      method: "POST",
      body: JSON.stringify({
        chainId: 1,
        address,
        timeSigned,
        signature: verified.signature,
      }),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ success: true })
  expect(saveServiceAgreementSignature).toHaveBeenCalledWith(verified)
})
