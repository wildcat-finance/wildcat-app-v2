import { ReactNode } from "react"

export type TransactionBlockRow = {
  label: string
  value: string
}

export type TransactionBlockProps = {
  title: string
  tooltip?: string
  warning?: boolean
  amount: string | undefined
  asset: string
  children: ReactNode
  /** Optional single-line breakdown shown under the amount. */
  subtitle?: string
  /** Key-value rows shown below a divider. */
  rows?: TransactionBlockRow[]
}
