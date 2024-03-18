import { ReactNode } from "react"
import { FormControl, InputLabel, Select } from "@mui/material"

export type ExtendedSelectProps = {
  label: string
  children: ReactNode
}

export const ExtendedSelect = ({ label, children }: ExtendedSelectProps) => (
  <FormControl>
    <InputLabel>{label}</InputLabel>
    <Select sx={{ width: "260px" }}>{children}</Select>
  </FormControl>
)
