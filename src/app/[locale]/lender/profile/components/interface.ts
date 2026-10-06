import { GridColDef } from "@mui/x-data-grid"

// Page-global. `field` is constrained to the row model's keys so a table's
// columns stay in sync with its rows. Shared by every lender-profile DataGrid.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }
