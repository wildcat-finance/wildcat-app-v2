import { SelectProps, SxProps, Theme } from "@mui/material"

export type ExtendedSelectOptionItem<T = string> = {
  value: T
  id: string
  label: string
}

export type ExtendedSelectProps<Value = string> = Omit<
  SelectProps<string>,
  "variant"
> & {
  options: ExtendedSelectOptionItem<Value>[]
  small?: boolean
  selectSX?: SxProps<Theme>
  optionSX?: SxProps<Theme>
}
