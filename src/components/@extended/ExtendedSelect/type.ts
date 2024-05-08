import { SelectProps, SxProps, Theme } from "@mui/material"

export type ExtendedSelectOptionItem<T = string> = {
  value: T
  id: string
  label: string
}

export type ExtendedSelectProps = Omit<SelectProps, "variant"> & {
  options: ExtendedSelectOptionItem[]
  small?: boolean
  selectSX?: SxProps<Theme>
  optionSX?: SxProps<Theme>
}
