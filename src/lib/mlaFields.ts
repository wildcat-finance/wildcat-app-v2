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
