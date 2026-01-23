import * as React from "react"

export type MobileNamePageBlockWrapperProps = {
  section: string
  setSection: (value: React.SetStateAction<"markets" | "info">) => void
  marketsAmount: number | undefined
  children: React.ReactNode
}
