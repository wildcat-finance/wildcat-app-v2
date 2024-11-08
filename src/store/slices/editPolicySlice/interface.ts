import { PolicyLenderTableDataType } from "@/app/[locale]/borrower/edit-policy/interface"

export type EditPolicyLendersListType = {
  lenderFilter: string
  step: "edit" | "confirm"
  policyName: string
  activeBorrowerMarkets: { name: string; address: string }[]
  initialLendersTableData: PolicyLenderTableDataType[]
  lendersTableData: PolicyLenderTableDataType[]
}
