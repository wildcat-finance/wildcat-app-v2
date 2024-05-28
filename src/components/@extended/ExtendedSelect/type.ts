import { SelectProps, SxProps, Theme } from "@mui/material"
import { Control, FieldValues, Path, FieldValue } from "react-hook-form"

export type ExtendedSelectOptionItem<Value = string> = {
  value: Value
  id: string
  label: string
}

export type ExtendedSelectProps<
  TFieldValues extends FieldValues = FieldValues,
> = Omit<SelectProps<string>, "variant"> & {
  options: ExtendedSelectOptionItem<FieldValue<TFieldValues>>[]
  small?: boolean
  selectSX?: SxProps<Theme>
  optionSX?: SxProps<Theme>
  control: Control<TFieldValues>
  name: Path<TFieldValues>
}
