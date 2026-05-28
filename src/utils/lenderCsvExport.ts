import { escapeCsvField, formatBigIntDecimal } from "@/utils/csvExport"

export {
  escapeCsvField,
  formatBigIntDecimal,
  triggerCsvDownload,
} from "@/utils/csvExport"

export type LenderExportEventType =
  | "Deposit"
  | "Withdrawal Request"
  | "Withdrawal Execution"

export type LenderExportEvent = {
  timestamp: number
  marketId: string
  marketName: string
  borrowerAddress: string
  type: LenderExportEventType
  amountRaw: string
  assetSymbol: string
  assetDecimals: number
  txHash: string
}

export type LenderExportPositionSnapshot = {
  marketId: string
  marketName: string
  borrowerAddress: string
  assetSymbol: string
  assetDecimals: number
  interestEarnedNative: string
}

export type LenderExportFilters = {
  fromTimestamp: number | null
  toTimestamp: number | null
  marketIds: string[] | null
}

const CSV_HEADER = [
  "date",
  "market_name",
  "market_address",
  "borrower_address",
  "event_type",
  "amount",
  "asset",
  "transaction_hash",
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

export const buildLenderCsv = (
  events: LenderExportEvent[],
  positions: LenderExportPositionSnapshot[],
  filters: LenderExportFilters,
  exportTimestamp: number,
): string => {
  const eventRows = events
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
    .map((event) => [
      formatIsoUtc(event.timestamp),
      escapeCsvField(event.marketName),
      event.marketId,
      event.borrowerAddress,
      event.type,
      formatBigIntDecimal(event.amountRaw, event.assetDecimals),
      event.assetSymbol,
      event.txHash,
    ])

  const interestRows = positions
    .filter(
      (position) =>
        matchesMarket(position.marketId, filters.marketIds) &&
        position.interestEarnedNative !== "" &&
        BigInt(position.interestEarnedNative.replace(".", "")) > BigInt(0),
    )
    .map((position) => [
      formatIsoUtc(exportTimestamp),
      escapeCsvField(position.marketName),
      position.marketId,
      position.borrowerAddress,
      "Interest",
      position.interestEarnedNative,
      position.assetSymbol,
      "",
    ])

  const allRows = [...eventRows, ...interestRows]
  const lines = [CSV_HEADER, ...allRows.map((row) => row.join(","))]
  return lines.join("\n")
}

export const buildExportFilename = (
  lenderAddress: string,
  filters: LenderExportFilters,
): string => {
  const short = `${lenderAddress.slice(0, 6).toLowerCase()}`
  const { fromTimestamp, toTimestamp } = filters

  if (fromTimestamp === null && toTimestamp === null) {
    return `wildcat-lender-${short}-all-time.csv`
  }

  const from =
    fromTimestamp !== null ? formatIsoDateOnly(fromTimestamp) : "start"
  const to = toTimestamp !== null ? formatIsoDateOnly(toTimestamp) : "now"
  return `wildcat-lender-${short}-${from}-${to}.csv`
}
