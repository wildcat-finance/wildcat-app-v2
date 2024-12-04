import { SwitchProps } from "@mui/material"
import { Control, FieldValues, Path } from "react-hook-form"

export type ExtendedSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
> = SwitchProps & {
  checkedcolor?: string
  uncheckedcolor?: string
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label?: string
  tooltip?: string
  subtitle?: string
}
