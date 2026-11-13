import { TFunction } from "i18next"

import { LenderKycOutcome, LenderKycWalletRow } from "@/lib/lenderKyc/types"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { DATE_FORMAT_WITH_TIME } from "@/utils/formatters"
import { isLenderKycDetailsEmpty } from "@/utils/lenderKycMessage"

import { LenderKycFilter, LenderKycOutcomeKey } from "./interface"

export const formatUtcDateTime = (iso: string | undefined) =>
  iso ? dayjs.utc(iso).format(DATE_FORMAT_WITH_TIME) : ""

export const formatCsvUtcDateTime = (iso: string | undefined) =>
  iso ? dayjs.utc(iso).format("YYYY-MM-DD HH:mm:ss") : ""

export const hasDetails = (row: LenderKycWalletRow) =>
  !!row.details && !isLenderKycDetailsEmpty(row.details)

export const matchesFilter = (
  row: LenderKycWalletRow,
  filter: LenderKycFilter,
) => filter !== "withDetails" || hasDetails(row)

export const LENDER_KYC_OUTCOME_KEYS: LenderKycOutcomeKey[] = [
  "submitted",
  "updated",
  "unchanged",
  "skipped",
  "closed",
  "notSignedDeclined",
  "notSignedWalletMismatch",
  "pending",
]

export const outcomeKey = (row: LenderKycWalletRow): LenderKycOutcomeKey => {
  if (!row.outcome) return "pending"
  if (row.outcome === "notSigned") {
    if (row.outcomeReason === "declined") return "notSignedDeclined"
    if (row.outcomeReason === "walletMismatch") return "notSignedWalletMismatch"
  }
  return row.outcome
}

export const outcomeLabel = (row: LenderKycWalletRow, t: TFunction) =>
  t(`admin.lenderKyc.outcomes.${outcomeKey(row)}`)

export const OUTCOME_CHIP_COLORS: Record<
  LenderKycOutcome | "pending",
  { backgroundColor: string; color: string }
> = {
  submitted: { backgroundColor: COLORS.glitter, color: COLORS.ultramarineBlue },
  updated: { backgroundColor: COLORS.lightGreen, color: "#168A4A" },
  unchanged: { backgroundColor: COLORS.lightGreen, color: "#168A4A" },
  skipped: { backgroundColor: COLORS.oasis, color: COLORS.butteredRum },
  closed: { backgroundColor: COLORS.whiteSmoke, color: COLORS.santasGrey },
  notSigned: { backgroundColor: COLORS.cherub, color: COLORS.dullRed },
  pending: { backgroundColor: COLORS.whiteSmoke, color: COLORS.santasGrey },
}

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
