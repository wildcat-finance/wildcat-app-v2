const bigIntPow10 = (exp: number): bigint => {
  let result = BigInt(1)
  for (let i = 0; i < exp; i += 1) {
    result *= BigInt(10)
  }
  return result
}

export const formatBigIntDecimal = (
  raw: string | bigint,
  decimals: number,
): string => {
  const value = typeof raw === "string" ? BigInt(raw) : raw
  const negative = value < BigInt(0)
  const absolute = negative ? -value : value

  if (decimals === 0) {
    return `${negative ? "-" : ""}${absolute.toString()}`
  }

  const divisor = bigIntPow10(decimals)
  const integerPart = absolute / divisor
  const fractionalPart = absolute % divisor
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0")
  return `${negative ? "-" : ""}${integerPart.toString()}.${fractionalStr}`
}

const CSV_NEEDS_QUOTING = /[",\r\n]/

export const escapeCsvField = (value: string): string => {
  if (value === "") return ""
  if (!CSV_NEEDS_QUOTING.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

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

export const triggerCsvDownload = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
