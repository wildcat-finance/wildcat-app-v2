import { LenderKycWalletRow } from "@/lib/lenderKyc/types"
import { dayjs } from "@/utils/dayjs"
import { DATE_FORMAT_WITH_TIME } from "@/utils/formatters"
import { isLenderKycDetailsEmpty } from "@/utils/lenderKycMessage"

import { LenderKycFilter } from "./interface"

export const formatUtcDateTime = (iso: string | undefined) =>
  iso ? dayjs.utc(iso).format(DATE_FORMAT_WITH_TIME) : ""

export const formatCsvUtcDateTime = (iso: string | undefined) =>
  iso ? dayjs.utc(iso).format("YYYY-MM-DD HH:mm:ss") : ""

export const hasDetails = (row: LenderKycWalletRow) =>
  !!row.detailsUnreadable ||
  (!!row.details && !isLenderKycDetailsEmpty(row.details))

export const matchesFilter = (
  row: LenderKycWalletRow,
  filter: LenderKycFilter,
) => filter !== "withDetails" || hasDetails(row)

const formulaPrefix = /^[=+\-@\t\r]/

const quotedCsvCell = (value: unknown) => {
  let text = value === undefined || value === null ? "" : String(value)
  if (formulaPrefix.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export const buildLenderKycCsv = (
  headers: string[],
  rows: unknown[][],
): string =>
  `${[headers, ...rows]
    .map((row) => row.map(quotedCsvCell).join(","))
    .join("\r\n")}\r\n`

export const downloadCsv = (fileName: string, csv: string) => {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
