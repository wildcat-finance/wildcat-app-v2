import { GridColDef } from "@mui/x-data-grid"

import { BorrowerInvitationForAdminView } from "@/app/api/invite/interface"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type BorrowerInvitationRow = BorrowerInvitationForAdminView
//  {
//   id: string
//   name: string
//   address: string
//   timeInvited: Date
//   timeSigned: Date | null
//   registeredOnChain: boolean
// }

export type BorrowerInvitesTableProps = {
  tableData: BorrowerInvitationRow[]
  isLoading: boolean
}
