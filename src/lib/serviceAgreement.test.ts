/**
 * @jest-environment node
 */
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { buildServiceAgreementMessage } from "@/lib/serviceAgreement"
import { formatUnixMsAsDate } from "@/utils/formatters"

// The builder must be byte-identical to the inline constructions it replaced
// (pre-Release-1 src/app/api/sla/route.ts and src/app/api/invite/route.ts):
// every existing signature verifies against text built exactly this way.
describe("buildServiceAgreementMessage", () => {
  const timestamps = [
    Date.UTC(2025, 1, 12, 16, 30, 0), // February 12, 2025
    Date.UTC(2025, 2, 5, 0, 0, 1), // March 05, 2025 - zero-padded day
    Date.UTC(2026, 5, 10, 23, 59, 59), // June 10, 2026 - just before UTC midnight
  ]

  it("matches the legacy lender construction", () => {
    timestamps.forEach((timeSigned) => {
      const dateSigned = formatUnixMsAsDate(timeSigned)
      const legacy = `${AgreementText}\n\nDate: ${dateSigned}`
      expect(
        buildServiceAgreementMessage({
          acknowledgementText: AgreementText,
          timeSigned,
        }),
      ).toBe(legacy)
    })
  })

  it("matches the legacy borrower construction", () => {
    const name = "Test Organization Ltd"
    timestamps.forEach((timeSigned) => {
      const dateSigned = formatUnixMsAsDate(timeSigned)
      let legacy = `${AgreementText}\n\nDate: ${dateSigned}`
      legacy = `${legacy}\n\nOrganization Name: ${name}`
      expect(
        buildServiceAgreementMessage({
          acknowledgementText: AgreementText,
          timeSigned,
          organizationName: name,
        }),
      ).toBe(legacy)
    })
  })

  it("renders the date in UTC with a zero-padded day", () => {
    expect(
      buildServiceAgreementMessage({
        acknowledgementText: "wrapper",
        timeSigned: Date.UTC(2025, 2, 5),
      }),
    ).toBe("wrapper\n\nDate: March 05, 2025")
  })
})
