export const LENDER_KYC_TERMS_VERSION = "v1"

export const LENDER_KYC_DOMAIN = "app.wildcat.finance"

export const LENDER_KYC_URI = "https://app.wildcat.finance"

export const LENDER_KYC_FIELD_MAX_LENGTH = 120

export const LENDER_KYC_SIGNATURE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export const LENDER_TYPES = [
  "retail",
  "institutional",
  "protocolOrDao",
] as const

export type LenderType = (typeof LENDER_TYPES)[number]

export const LENDER_TYPE_MESSAGE_LABELS: Record<LenderType, string> = {
  retail: "Retail",
  institutional: "Institutional",
  protocolOrDao: "Protocol or DAO",
}
