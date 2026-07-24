import { escapeCsvField, formatBigIntDecimal } from "@/utils/csvExport"

export type BorrowerExportEventType =
  | "Borrow"
  | "Repay"
  | "APR change"
  | "Capacity change"
  | "Delinquency"

export type BorrowerExportSummaryType =
  | "Interest accrued"
  | "Interest paid"
  | "Lender deposits"
  | "Lender withdrawals"
  | "Net lender flow"
  | "Active lender count"

export type BorrowerExportRowType =
  | BorrowerExportEventType
  | BorrowerExportSummaryType

export type BorrowerExportBaseRow = {
  timestamp: number
  marketId: string
  marketName: string
  assetSymbol: string
  assetDecimals: number
}

export type BorrowerExportBorrowEvent = BorrowerExportBaseRow & {
  type: "Borrow"
  amountRaw: string
  txHash: string
}

export type BorrowerExportRepayEvent = BorrowerExportBaseRow & {
  type: "Repay"
  amountRaw: string
  txHash: string
}

export type BorrowerExportAprChangeEvent = BorrowerExportBaseRow & {
  type: "APR change"
  oldBips: number
  newBips: number
  txHash: string
}

export type BorrowerExportCapacityChangeEvent = BorrowerExportBaseRow & {
  type: "Capacity change"
  oldMaxRaw: string
  newMaxRaw: string
  txHash: string
}

export type BorrowerExportDelinquencyEvent = BorrowerExportBaseRow & {
  type: "Delinquency"
  startTimestamp: number
  cureTimestamp: number | null
  durationHours: number
  penaltyTriggered: boolean
  txHash: string
}

export type BorrowerExportEvent =
  | BorrowerExportBorrowEvent
  | BorrowerExportRepayEvent
  | BorrowerExportAprChangeEvent
  | BorrowerExportCapacityChangeEvent
  | BorrowerExportDelinquencyEvent

export type BorrowerExportMarketAggregate = {
  marketId: string
  marketName: string
  assetSymbol: string
  assetDecimals: number
  totalBaseInterestAccruedRaw: string
  totalRepaidRaw: string
  totalDepositedRaw: string
  totalWithdrawalsExecutedRaw: string
  activeLenderCount: number
}

export type BorrowerExportFilters = {
  fromTimestamp: number | null
  toTimestamp: number | null
  marketIds: string[] | null
}

export type BorrowerExportData = {
  events: BorrowerExportEvent[]
  aggregates: BorrowerExportMarketAggregate[]
}

const CSV_HEADER = [
  "date",
  "market_name",
  "market_address",
  "event_type",
  "amount",
  "asset",
  "transaction_hash",
  "previous_value",
  "new_value",
  "cure_date",
  "duration_hours",
  "penalty_triggered",
  "change_unit",
  "notes",
].join(",")

const formatIsoUtc = (timestampSeconds: number): string => {
  const date = new Date(timestampSeconds * 1000)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
      date.getUTCDate(),
    )}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
      date.getUTCSeconds(),
    )}Z`
  )
}

const formatIsoDateOnly = (timestampSeconds: number): string => {
  const date = new Date(timestampSeconds * 1000)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`
}

const matchesMarket = (
  marketId: string,
  filterMarketIds: string[] | null,
): boolean => {
  if (filterMarketIds === null || filterMarketIds.length === 0) return true
  return filterMarketIds.includes(marketId)
}

const eventInDateRange = (
  timestamp: number,
  fromTimestamp: number | null,
  toTimestamp: number | null,
): boolean => {
  if (fromTimestamp !== null && timestamp < fromTimestamp) return false
  if (toTimestamp !== null && timestamp > toTimestamp) return false
  return true
}

const formatBipsAsPercent = (bips: number): string => (bips / 100).toFixed(2)

const minBigInt = (a: bigint, b: bigint): bigint => (a < b ? a : b)

type Row = string[]

const buildEventRow = (event: BorrowerExportEvent): Row => {
  const base = [
    formatIsoUtc(event.timestamp),
    escapeCsvField(event.marketName),
    event.marketId,
  ]

  if (event.type === "Borrow" || event.type === "Repay") {
    return [
      ...base,
      event.type,
      formatBigIntDecimal(event.amountRaw, event.assetDecimals),
      event.assetSymbol,
      event.txHash,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]
  }

  if (event.type === "APR change") {
    return [
      ...base,
      event.type,
      "",
      event.assetSymbol,
      event.txHash,
      formatBipsAsPercent(event.oldBips),
      formatBipsAsPercent(event.newBips),
      "",
      "",
      "",
      "%",
      "",
    ]
  }

  if (event.type === "Capacity change") {
    return [
      ...base,
      event.type,
      "",
      event.assetSymbol,
      event.txHash,
      formatBigIntDecimal(event.oldMaxRaw, event.assetDecimals),
      formatBigIntDecimal(event.newMaxRaw, event.assetDecimals),
      "",
      "",
      "",
      "tokens",
      "",
    ]
  }

  // Delinquency
  return [
    ...base,
    event.type,
    "",
    event.assetSymbol,
    event.txHash,
    "",
    "",
    event.cureTimestamp !== null ? formatIsoUtc(event.cureTimestamp) : "",
    event.durationHours.toFixed(2),
    event.penaltyTriggered ? "true" : "false",
    "",
    event.cureTimestamp === null ? "Ongoing" : "",
  ]
}

const buildSummaryRows = (
  aggregate: BorrowerExportMarketAggregate,
  exportTimestamp: number,
): Row[] => {
  const exportDate = formatIsoUtc(exportTimestamp)
  const base = [
    exportDate,
    escapeCsvField(aggregate.marketName),
    aggregate.marketId,
  ]
  const trailing = ["", "", "", "", "", "", "", ""]

  const interestAccruedRaw = BigInt(aggregate.totalBaseInterestAccruedRaw)
  const interestPaidRaw = minBigInt(
    BigInt(aggregate.totalRepaidRaw),
    interestAccruedRaw,
  )
  const depositsRaw = BigInt(aggregate.totalDepositedRaw)
  const withdrawalsRaw = BigInt(aggregate.totalWithdrawalsExecutedRaw)
  const netFlowRaw = depositsRaw - withdrawalsRaw

  return [
    [
      ...base,
      "Interest accrued",
      formatBigIntDecimal(interestAccruedRaw, aggregate.assetDecimals),
      aggregate.assetSymbol,
      ...trailing,
    ],
    [
      ...base,
      "Interest paid",
      formatBigIntDecimal(interestPaidRaw, aggregate.assetDecimals),
      aggregate.assetSymbol,
      ...trailing,
    ],
    [
      ...base,
      "Lender deposits",
      formatBigIntDecimal(depositsRaw, aggregate.assetDecimals),
      aggregate.assetSymbol,
      ...trailing,
    ],
    [
      ...base,
      "Lender withdrawals",
      formatBigIntDecimal(withdrawalsRaw, aggregate.assetDecimals),
      aggregate.assetSymbol,
      ...trailing,
    ],
    [
      ...base,
      "Net lender flow",
      formatBigIntDecimal(netFlowRaw, aggregate.assetDecimals),
      aggregate.assetSymbol,
      ...trailing,
    ],
    [
      ...base,
      "Active lender count",
      formatBigIntDecimal(BigInt(aggregate.activeLenderCount), 0),
      "",
      ...trailing,
    ],
  ]
}

export const buildBorrowerCsv = (
  data: BorrowerExportData,
  filters: BorrowerExportFilters,
  exportTimestamp: number,
): string => {
  const eventRows = data.events
    .filter(
      (event) =>
        matchesMarket(event.marketId, filters.marketIds) &&
        eventInDateRange(
          event.timestamp,
          filters.fromTimestamp,
          filters.toTimestamp,
        ),
    )
    .sort((left, right) => right.timestamp - left.timestamp)
    .map(buildEventRow)

  const summaryRows = data.aggregates
    .filter((aggregate) => matchesMarket(aggregate.marketId, filters.marketIds))
    .flatMap((aggregate) => buildSummaryRows(aggregate, exportTimestamp))

  const allRows = [...summaryRows, ...eventRows]
  const lines = [CSV_HEADER, ...allRows.map((row) => row.join(","))]
  return lines.join("\n")
}

export const buildBorrowerExportFilename = (
  borrowerAddress: string,
  filters: BorrowerExportFilters,
): string => {
  const short = borrowerAddress.slice(0, 6).toLowerCase()
  const { fromTimestamp, toTimestamp } = filters

  if (fromTimestamp === null && toTimestamp === null) {
    return `wildcat-borrower-${short}-all-time.csv`
  }

  const from =
    fromTimestamp !== null ? formatIsoDateOnly(fromTimestamp) : "start"
  const to = toTimestamp !== null ? formatIsoDateOnly(toTimestamp) : "now"
  return `wildcat-borrower-${short}-${from}-${to}.csv`
}
