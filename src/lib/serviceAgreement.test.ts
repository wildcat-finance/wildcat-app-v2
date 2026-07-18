/**
 * @jest-environment node
 */
import {
  buildServiceAgreementDeclineMessage,
  buildServiceAgreementMessage,
} from "@/lib/serviceAgreement"
import { formatUnixMsAsDate } from "@/utils/formatters"

const AgreementText =
  "I agree to the Wildcat Terms of Use located at https://docs.wildcat.finance/legal/wildcat-terms-of-use, last updated on 12 February, 2025.\n\nHash of agreement text: 711a9e6707e6cf85166786461a0a45aa3b926b22b414abe8dfcc6c1afef020d1"

// V2 binds every new action to its chain and exact signing time. The stored
// acknowledgement text remains unchanged.
describe("buildServiceAgreementMessage", () => {
  const chainId = 1
  const timestamps = [
    Date.UTC(2025, 1, 12, 16, 30, 0), // February 12, 2025
    Date.UTC(2025, 2, 5, 0, 0, 1), // March 05, 2025 - zero-padded day
    Date.UTC(2026, 5, 10, 23, 59, 59), // June 10, 2026 - just before UTC midnight
  ]

  it("binds lender acceptance to chain and exact timestamp", () => {
    timestamps.forEach((timeSigned) => {
      const dateSigned = formatUnixMsAsDate(timeSigned)
      const expected =
        `${AgreementText}\n\nDate: ${dateSigned}` +
        `\n\nChain ID: ${chainId}\n\nTimestamp: ${timeSigned}`
      expect(
        buildServiceAgreementMessage({
          acknowledgementText: AgreementText,
          timeSigned,
          chainId,
        }),
      ).toBe(expected)
    })
  })

  it("binds borrower acceptance without changing the organization line", () => {
    const name = "Test Organization Ltd"
    timestamps.forEach((timeSigned) => {
      const dateSigned = formatUnixMsAsDate(timeSigned)
      let expected =
        `${AgreementText}\n\nDate: ${dateSigned}` +
        `\n\nChain ID: ${chainId}\n\nTimestamp: ${timeSigned}`
      expected = `${expected}\n\nOrganization Name: ${name}`
      expect(
        buildServiceAgreementMessage({
          acknowledgementText: AgreementText,
          timeSigned,
          chainId,
          organizationName: name,
        }),
      ).toBe(expected)
    })
  })

  it("renders the date in UTC with a zero-padded day", () => {
    expect(
      buildServiceAgreementMessage({
        acknowledgementText: "wrapper",
        timeSigned: Date.UTC(2025, 2, 5),
        chainId,
      }),
    ).toBe(
      "wrapper\n\nDate: March 05, 2025\n\nChain ID: 1" +
        `\n\nTimestamp: ${Date.UTC(2025, 2, 5)}`,
    )
  })
})

describe("buildServiceAgreementDeclineMessage", () => {
  const input = {
    version: "tou-2026-07-01",
    plaintextSha256: "abc123",
    timeSigned: Date.UTC(2026, 6, 17),
    chainId: 1,
  }

  it("binds a lender decline to the lender capacity", () => {
    expect(
      buildServiceAgreementDeclineMessage({ ...input, party: "Lender" }),
    ).toBe(
      "I decline the Wildcat Terms of Use version tou-2026-07-01.\n\n" +
        "Hash of agreement text: abc123\n\n" +
        "Date: July 17, 2026\n\n" +
        "Chain ID: 1\n\nTimestamp: 1784246400000\n\nParty: Lender\n\n" +
        "Reason: Not provided",
    )
  })

  it("binds a borrower decline to its organization capacity", () => {
    expect(
      buildServiceAgreementDeclineMessage({
        ...input,
        party: "Borrower",
        organizationName: "Wildcat Labs",
      }),
    ).toBe(
      "I decline the Wildcat Terms of Use version tou-2026-07-01.\n\n" +
        "Hash of agreement text: abc123\n\n" +
        "Date: July 17, 2026\n\n" +
        "Chain ID: 1\n\nTimestamp: 1784246400000\n\n" +
        "Party: Borrower\n\n" +
        "Organization Name: Wildcat Labs\n\n" +
        "Reason: Not provided",
    )
  })

  it("binds a canonicalized reason to the decline", () => {
    expect(
      buildServiceAgreementDeclineMessage({
        ...input,
        party: "Lender",
        reason: "  I do not agree.  ",
      }),
    ).toContain("\n\nReason: I do not agree.")
  })
})
