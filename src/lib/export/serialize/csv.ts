const formulaPrefix = /^[=+\-@]/
const decimalNumber = /^-?\d+(?:\.\d+)?$/

export const csvCell = (value: unknown): string => {
  let text = value === undefined || value === null ? "" : String(value)
  if (formulaPrefix.test(text) && !decimalNumber.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function createCsv(
  headers: readonly string[],
  rows: readonly Record<string, unknown>[],
) {
  return `${headers.join(",")}\n${rows
    .map((row) => headers.map((header) => csvCell(row[header])).join(","))
    .join("\n")}\n`
}
