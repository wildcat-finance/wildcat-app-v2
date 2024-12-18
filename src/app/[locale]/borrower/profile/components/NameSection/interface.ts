import { ReactNode } from "react"

export type NameSectionProps = {
  avatar?: ReactNode
  name?: string
  description?: string
  website?: string
  twitter?: string
  linkedin?: string
  marketsAmount?: number

  type: "user" | "external"
}
