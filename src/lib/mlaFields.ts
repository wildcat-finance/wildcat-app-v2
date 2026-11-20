/// Placeholders an MLA template can use, as `{{source}}` in its text. Kept
/// free of dependencies so forms and tests can use it without the SDK.
export const MlaFieldValueKeys = [
  // number
  "network.chainId",
  // string
  "network.name",
  "asset.name",
  "asset.symbol",
  "market.marketType",
  "market.name",
  "market.symbol",
  "borrower.name",
  "borrower.jurisdiction",
  "borrower.physicalAddress",
  "borrower.entityKind",
  // address (format as checksum address)
  "market.depositAccess",
  "market.transferAccess",
  "market.withdrawalAccess",
  "asset.address",
  "market.address",
  "borrower.address",
  "lender.address",
  "chainalysisOracle.address",
  "hooksFactory.address",
  // token amount
  "market.capacity",
  "market.minimumDeposit",
  // duration
  "market.delinquencyGracePeriod",
  "market.withdrawalBatchDuration",
  // Date
  "market.fixedTermEndTime",
  "borrower.timeSigned",
  "lender.timeSigned",
  "lender.timeSignedDayOrdinal",
  "lender.timeSignedMonthYear",
  "sla.timeUpdated",
  // bips (format as %)
  "market.apr",
  "market.delinquencyFee",
  "market.reserveRatio",
  // boolean (format as Yes, No, N/A)
  "market.allowClosureBeforeTerm",
  "market.allowTermReduction",
  "market.allowForceBuyBack",
] as const

export type MlaFieldValueKey = (typeof MlaFieldValueKeys)[number]
// // number
// | "network.chainId"
// // string
// | "network.name"
// | "asset.name"
// | "asset.symbol"
// | "market.marketType"
// | "market.name"
// | "market.symbol"
// | "borrower.name"
// | "borrower.jurisdiction"
// | "borrower.physicalAddress"
// | "borrower.entityKind"
// // address (format as checksum address)
// | "market.depositAccess"
// | "market.transferAccess"
// | "market.withdrawalAccess"
// | "asset.address"
// | "market.address"
// | "borrower.address"
// | "lender.address"
// | "chainalysisOracle.address"
// | "hooksFactory.address"
// // token amount
// | "market.capacity"
// | "market.minimumDeposit"
// // duration
// | "market.delinquencyGracePeriod"
// | "market.withdrawalBatchDuration"
// // Date
// | "market.fixedTermEndTime"
// | "borrower.timeSigned"
// | "lender.timeSigned"
// | "lender.timeSignedDayOrdinal"
// | "lender.timeSignedMonthYear"
// | "sla.timeUpdated"
// // bips (format as %)
// | "market.apr"
// | "market.delinquencyFee"
// | "market.reserveRatio"
// // boolean (format as Yes, No, N/A)
// | "market.allowClosureBeforeTerm"
// | "market.allowTermReduction"
// | "market.allowForceBuyBack"

export type MlaTemplateField = {
  /* one of the possible field keys */
  source: MlaFieldValueKey
  /* text to use when value is unavailable */
  placeholder: string
}

/// The placeholder a custom MLA gives a field when the network class's market
/// MLA does not list it.
export const MLA_FIELD_PLACEHOLDERS: Record<MlaFieldValueKey, string> = {
  "network.chainId": "Chain ID",
  "network.name": "Network",
  "asset.name": "Asset Name",
  "asset.symbol": "Asset Symbol",
  "market.marketType": "Market Type",
  "market.name": "Market Name",
  "market.symbol": "Market Symbol",
  "borrower.name": "Borrower Name",
  "borrower.jurisdiction": "Borrower Jurisdiction",
  "borrower.physicalAddress": "Borrower Physical Address",
  "borrower.entityKind": "Borrower Entity Type",
  "market.depositAccess": "Deposit Access",
  "market.transferAccess": "Transfer Access",
  "market.withdrawalAccess": "Withdrawal Access",
  "asset.address": "Asset Address",
  "market.address": "Market Address",
  "borrower.address": "Borrower Address",
  "lender.address": "Lender Address",
  "chainalysisOracle.address": "Chainalysis Oracle Address",
  "hooksFactory.address": "Hooks Factory Address",
  "market.capacity": "Market Capacity",
  "market.minimumDeposit": "Minimum Deposit",
  "market.delinquencyGracePeriod": "Grace Period",
  "market.withdrawalBatchDuration": "Withdrawal Cycle",
  "market.fixedTermEndTime": "Fixed Term End Date",
  "borrower.timeSigned": "Borrower Signing Date",
  "lender.timeSigned": "Date Signed",
  "lender.timeSignedDayOrdinal": "Day Signed",
  "lender.timeSignedMonthYear": "Month and Year Signed",
  "sla.timeUpdated": "Service Agreement Date",
  "market.apr": "Annual Interest Rate",
  "market.delinquencyFee": "Delinquency Fee",
  "market.reserveRatio": "Reserve Ratio",
  "market.allowClosureBeforeTerm": "Closure Before Term Allowed",
  "market.allowTermReduction": "Term Reduction Allowed",
  "market.allowForceBuyBack": "Force Buyback Allowed",
}
