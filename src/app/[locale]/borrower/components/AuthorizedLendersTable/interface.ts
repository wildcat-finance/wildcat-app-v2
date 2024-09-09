import { LendersDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"

export type LendersTableProps = {
  label: string
  tableData: LendersDataT[]
  isOpen?: boolean
  isLoading: boolean
}
