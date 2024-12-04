import { GridColDef } from "@mui/x-data-grid"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type PolicyDataT = {
  id: string
  name: string
  kind: string
  numMarkets: number
  accessRequirements: string
}

export type PoliciesTableProps = {
  label: string
  isOpen?: boolean
}
