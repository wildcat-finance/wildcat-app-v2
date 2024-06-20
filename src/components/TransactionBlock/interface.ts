import { ReactNode } from "react"

export type TransactionBlockProps = {
  title: string
  tooltip?: string
  warning?: boolean
  amount: string | undefined
  asset: string
  children: ReactNode
}
