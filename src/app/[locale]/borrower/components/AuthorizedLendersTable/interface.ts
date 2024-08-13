export type LendersTableProps = {
  label: string
  tableData: {
    isAuth: boolean
    address: string
    markets: { marketName: string; address: string }[]
  }[]
  isOpen?: boolean
  isLoading: boolean
}
