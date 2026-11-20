export const LENDER_KYC_TERMS_VERSION = "v1"

export const LENDER_KYC_DOMAIN = "app.wildcat.finance"

export const LENDER_KYC_URI = "https://app.wildcat.finance"

export const LENDER_KYC_FIELD_MAX_LENGTH = 120

export const LENDER_KYC_SIGNATURE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export const LENDER_TYPES = [
  "individual",
  "defiAllocatorDaoTreasury",
  "assetManagerInstitutionalFund",
  "familyOfficePrivateWealth",
  "corporateTreasury",
  "marketMakingTradingFirm",
] as const

export type LenderType = (typeof LENDER_TYPES)[number]

export const LENDER_TYPE_MESSAGE_LABELS: Record<LenderType, string> = {
  individual: "Individual",
  defiAllocatorDaoTreasury: "DeFi Allocator / DAO Treasury",
  assetManagerInstitutionalFund: "Asset Manager / Institutional Fund",
  familyOfficePrivateWealth: "Family Office / Private Wealth",
  corporateTreasury: "Corporate Treasury",
  marketMakingTradingFirm: "Market Making / Trading Firm",
}

export const isLenderType = (value: unknown): value is LenderType =>
  LENDER_TYPES.some((type) => type === value)

export const sortLenderTypes = (values: readonly unknown[]): LenderType[] =>
  LENDER_TYPES.filter((type) => values.includes(type))
