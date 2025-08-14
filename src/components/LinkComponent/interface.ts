import { SxProps, Theme } from "@mui/material"

export type LinkGroupProps = {
  type?: "withCopy" | "etherscan"
  copyValue?: string
  linkValue?: string
  groupSX?: SxProps<Theme>
  iconSize?: string
}
