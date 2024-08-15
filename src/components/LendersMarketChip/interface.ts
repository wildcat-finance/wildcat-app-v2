export type LendersMarketChipProps = {
  type?: "regular" | "added" | "deleted"
  marketName: string
  withButton?: boolean
  onClick?: () => void
  width?: string
}
