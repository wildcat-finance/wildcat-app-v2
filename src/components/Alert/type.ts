import { ReactNode } from "react"

import { SxProps, Theme } from "@mui/material"

export type AlertColor = "blue" | "red" | "green" | "amber"

export type AlertProps = {
  color: AlertColor
  text: ReactNode
  variant?: "text2" | "text3"
  sx?: SxProps<Theme>
}
