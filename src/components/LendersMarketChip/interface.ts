export type LendersMarketChipProps = {
  type?: "old" | "new" | "deleted"
  marketName: string
  withButton?: boolean
  onClick?: () => void
  width?: string
}
