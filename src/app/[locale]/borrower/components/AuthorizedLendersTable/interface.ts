import { LendersDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type LendersTableProps = {
  label: string
  tableData: LendersDataT[]
  isOpen?: boolean
  isLoading: boolean
}
