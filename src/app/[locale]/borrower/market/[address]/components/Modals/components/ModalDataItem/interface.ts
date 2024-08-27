import { ReactNode } from "react"

import { SxProps, Theme } from "@mui/material"

export type ModalDataItemProps = {
  title: string
  value: string | number
  containerSx?: SxProps<Theme>
  valueColor?: string
  children?: ReactNode
}
