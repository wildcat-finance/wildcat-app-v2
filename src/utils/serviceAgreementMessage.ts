import { formatUnixMsAsDate } from "@/utils/formatters"

export const SERVICE_AGREEMENT_SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000

export const normalizeServiceAgreementDeclineReason = (reason?: string) =>
  reason?.trim() || undefined

export const buildServiceAgreementMessage = ({
  acknowledgementText,
  timeSigned,
  chainId,
  organizationName,
}: {
  acknowledgementText: string
  timeSigned: number
  chainId: number
  organizationName?: string
}): string => {
  let message = `${acknowledgementText}\n\nDate: ${formatUnixMsAsDate(
    timeSigned,
  )}\n\nChain ID: ${chainId}\n\nTimestamp: ${timeSigned}`
  if (organizationName) {
    message = `${message}\n\nOrganization Name: ${organizationName}`
  }
  return message
}

/// The message an account wallet-signs to decline a ToU version. Deliberately
/// unambiguous - it can never be mistaken for an acceptance (mirrors
/// DECLINE_MLA_ASSIGNMENT_MESSAGE in config/mla-rejection.ts).
export const buildServiceAgreementDeclineMessage = ({
  version,
  plaintextSha256,
  timeSigned,
  chainId,
  party,
  organizationName,
  reason,
}: {
  version: string
  plaintextSha256: string
  timeSigned: number
  chainId: number
  party: "Borrower" | "Lender"
  organizationName?: string
  reason?: string
}): string => {
  let message =
    `I decline the Wildcat Terms of Use version ${version}.` +
    `\n\nHash of agreement text: ${plaintextSha256}` +
    `\n\nDate: ${formatUnixMsAsDate(timeSigned)}` +
    `\n\nChain ID: ${chainId}` +
    `\n\nTimestamp: ${timeSigned}` +
    `\n\nParty: ${party}`
  if (organizationName) {
    message = `${message}\n\nOrganization Name: ${organizationName}`
  }
  return `${message}\n\nReason: ${
    normalizeServiceAgreementDeclineReason(reason) ?? "Not provided"
  }`
}
