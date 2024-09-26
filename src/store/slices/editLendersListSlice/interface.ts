import { LenderTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type EditLendersListType = {
  lenderFilter: string
  marketFilter: { name: string; address: string }
  step: "edit" | "confirm"
  activeBorrowerMarkets: { name: string; address: string }[]
  initialLendersTableData: LenderTableDataType[]
  lendersTableData: LenderTableDataType[]
}
