import { formatUnixMsAsDate } from "@/utils/formatters"

export const buildServiceAgreementMessage = ({
  acknowledgementText,
  timeSigned,
  organizationName,
}: {
  acknowledgementText: string
  timeSigned: number
  organizationName?: string
}): string => {
  let message = `${acknowledgementText}\n\nDate: ${formatUnixMsAsDate(
    timeSigned,
  )}`
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
}: {
  version: string
  plaintextSha256: string
  timeSigned: number
}): string =>
  `I decline the Wildcat Terms of Use version ${version}.` +
  `\n\nHash of agreement text: ${plaintextSha256}` +
  `\n\nDate: ${formatUnixMsAsDate(timeSigned)}`
