import { LenderTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type EditLendersListType = {
  lenderFilter: string
  marketFilter: string
  step: "edit" | "confirm"
  initialLendersTableData: LenderTableDataType[]
  lendersTableData: LenderTableDataType[]
}
