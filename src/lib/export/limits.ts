import { CanonicalExportRequest } from "./types"

export const MAX_EXPORT_STATEMENTS = 100
export const MAX_EXPORT_PART_BYTES = 150 * 1_024 * 1_024
export const MAX_EXPORT_DATASET_BYTES = 256 * 1_024 * 1_024

export function countExportStatements(
  request: CanonicalExportRequest,
  marketCount: number,
) {
  const perMarket =
    Number(request.statements.includes("market_condition")) +
    Number(request.statements.includes("borrower")) +
    (request.statements.includes("position") ? request.addresses.length : 0)
  return perMarket * marketCount
}

export function assertExportWithinLimits(
  request: CanonicalExportRequest,
  marketCount: number,
) {
  const statements = countExportStatements(request, marketCount)
  if (statements > MAX_EXPORT_STATEMENTS) {
    throw new Error(
      `This request would create ${statements} statements; the limit is ${MAX_EXPORT_STATEMENTS}`,
    )
  }
}
