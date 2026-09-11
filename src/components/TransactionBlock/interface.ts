import { ReactNode } from "react"

export type TransactionBlockRow = {
  label: string
  value: string
}

export type TransactionBlockProps = {
  /** Automation anchor: data-testid on the amount element. */
  testId?: string
  /** Automation anchor: raw (unformatted) value exposed as data-value on the amount element. */
  dataValue?: string
  title: string
  tooltip?: string
  warning?: boolean
  amount: string | undefined
  asset: string
  children: ReactNode
  /** Optional single-line breakdown shown under the amount. */
  subtitle?: string
  /** Full-width action status shown below the amount. */
  status?: string
  /** Key-value rows shown below a divider. */
  rows?: TransactionBlockRow[]
}
