import { ReactNode } from "react"

export type ExtendedSelectOptionItem<T = string> = {
  value: T
  id: string
  label: string
}

export type ExtendedSelectProps = {
  label: string
  children?: ReactNode
  small?: boolean
}
