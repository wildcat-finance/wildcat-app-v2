import { ReactNode } from "react"

export type TxModalHeaderProps = {
  title: string
  children?: ReactNode
  tooltip?: string
  divider?: boolean
  arrowOnClick: (() => void) | null
  crossOnClick: (() => void) | null
}
