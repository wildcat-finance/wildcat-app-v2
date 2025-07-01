import { GridColDef } from "@mui/x-data-grid"

import { BorrowerInvitationForAdminView } from "@/app/api/invite/interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type BorrowerInvitationRow = BorrowerInvitationForAdminView
