import {
  LENDER_KYC_DOMAIN,
  LENDER_KYC_TERMS_VERSION,
  LENDER_KYC_URI,
  LENDER_TYPE_MESSAGE_LABELS,
  LenderType,
  sortLenderTypes,
} from "@/config/lender-kyc"
import { formatUnixMsAsDate } from "@/utils/formatters"

export type LenderKycDetails = {
  fullName: string
  email: string
  companyName: string
  lenderTypes: LenderType[]
}

export type LenderKycMessageKind = "details" | "ownership"

export type LenderKycMessageInput = {
  kind: LenderKycMessageKind
  address: string
  chainId: number
  nonce: string
  timeSigned: number
  details?: LenderKycDetails
}

const NOT_PROVIDED = "Not provided"

const FORBIDDEN_CHARACTERS =
  /[\p{Cc}\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/u

export const hasLenderKycForbiddenCharacters = (value: string) =>
  FORBIDDEN_CHARACTERS.test(value.trim())

const valueOrNotProvided = (value: string | undefined) =>
  value && value.trim() ? value.trim() : NOT_PROVIDED

const normalizeText = (value: string) => {
  const trimmed = value.trim()
  return trimmed === NOT_PROVIDED ? "" : trimmed
}

export const normalizeLenderKycDetails = (
  details: LenderKycDetails,
): LenderKycDetails => ({
  fullName: normalizeText(details.fullName),
  email: normalizeText(details.email).toLowerCase(),
  companyName: normalizeText(details.companyName),
  lenderTypes: sortLenderTypes(details.lenderTypes),
})

export const isLenderKycDetailsEmpty = (details: LenderKycDetails) => {
  const normalized = normalizeLenderKycDetails(details)
  return (
    !normalized.fullName &&
    !normalized.email &&
    !normalized.companyName &&
    !normalized.lenderTypes.length
  )
}

export const areLenderKycDetailsEqual = (
  a: LenderKycDetails,
  b: LenderKycDetails,
) => {
  const left = normalizeLenderKycDetails(a)
  const right = normalizeLenderKycDetails(b)
  return (
    left.fullName === right.fullName &&
    left.email === right.email &&
    left.companyName === right.companyName &&
    left.lenderTypes.join(",") === right.lenderTypes.join(",")
  )
}

const buildStatement = (kind: LenderKycMessageKind) =>
  kind === "ownership"
    ? `I confirm that I control this wallet. I accept the Wildcat Verification Terms ${LENDER_KYC_TERMS_VERSION} and agree to be forwarded to SOMA.finance.`
    : `I accept the Wildcat Verification Terms ${LENDER_KYC_TERMS_VERSION} and agree to be forwarded to SOMA.finance. The details below are linked to this wallet.`

const buildDetailsBlock = (details: LenderKycDetails) => {
  const normalized = normalizeLenderKycDetails(details)
  return [
    `Full name: ${valueOrNotProvided(normalized.fullName)}`,
    `Email: ${valueOrNotProvided(normalized.email)}`,
    `Company: ${valueOrNotProvided(normalized.companyName)}`,
    `Lender type: ${
      normalized.lenderTypes.length
        ? normalized.lenderTypes
            .map((type) => LENDER_TYPE_MESSAGE_LABELS[type])
            .join(", ")
        : NOT_PROVIDED
    }`,
  ].join("\n")
}

export const buildLenderKycMessage = ({
  kind,
  address,
  chainId,
  nonce,
  timeSigned,
  details,
}: LenderKycMessageInput) => {
  const blocks = [
    `${LENDER_KYC_DOMAIN} wants you to sign in with your Ethereum account:\n${address.toLowerCase()}`,
    buildStatement(kind),
  ]
  if (kind === "details" && details) blocks.push(buildDetailsBlock(details))
  blocks.push(
    [
      `URI: ${LENDER_KYC_URI}`,
      "Version: 1",
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date(timeSigned).toISOString()}`,
      `Terms version: ${LENDER_KYC_TERMS_VERSION}`,
    ].join("\n"),
  )
  blocks.push(`Date: ${formatUnixMsAsDate(timeSigned)}`)
  return blocks.join("\n\n")
}
