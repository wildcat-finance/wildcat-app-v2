export type LendersMarketChipProps = {
  type?: "old" | "new" | "deleted"
  marketName: string
  withButton?: boolean
  onClick?: () => void
  width?: string
  disabled?: boolean
  // Accessible name for the icon-only button, e.g. "Remove USDC Market".
  buttonLabel?: string
}
