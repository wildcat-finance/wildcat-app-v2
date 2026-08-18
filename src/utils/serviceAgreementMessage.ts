import { formatUnixMsAsDate } from "@/utils/formatters"

/// timeSigned is embedded in the wallet-signed message, so the server cannot
/// replace it with its own clock - it can only refuse claims that disagree
/// with it by more than the signing-ceremony window. The window is wide
/// because Safe threshold signatures are legitimately proposed days before
/// they are submitted; it still prevents arbitrary backdating of the stored
/// legal record and the far-future timeSigned that would permanently win the
/// monotonic replace guard in saveServiceAgreementSignature/Refusal.
/// Lives here (not lib/) so client flows can align pending-signature expiry
/// with the server's acceptance window.
export const SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000
export const SERVICE_AGREEMENT_TIME_SIGNED_MAX_FUTURE_MS = 5 * 60 * 1000

export function isServiceAgreementTimeSignedInBounds(
  timeSigned: number,
  now: number = Date.now(),
): boolean {
  return (
    Number.isFinite(timeSigned) &&
    timeSigned >= now - SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS &&
    timeSigned <= now + SERVICE_AGREEMENT_TIME_SIGNED_MAX_FUTURE_MS
  )
}

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
