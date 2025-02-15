import { ReactNode } from "react"

export type NameSectionProps = {
  avatar?: ReactNode
  name?: string
  alias?: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  linkedin?: string
  marketsAmount?: number

  type: "user" | "external"
}
