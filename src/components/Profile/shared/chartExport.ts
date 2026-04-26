const csvCell = (value: string | number | boolean | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`

export const buildCsv = (
  rows: Array<Array<string | number | boolean | null | undefined>>,
) => rows.map((row) => row.map(csvCell).join(",")).join("\n")
