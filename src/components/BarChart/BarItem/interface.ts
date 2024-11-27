import { TokenAmount } from "@wildcatfi/wildcat-sdk"

export type MarketBarChartItem = {
  id: string
  label: string
  value: TokenAmount
  asset: string
  width: string
  color: string
  textColor?: string
  className?: string
  legendDotClassName?: string
}

export type BarItemProps = {
  chartItem: MarketBarChartItem
  isOnlyBarItem?: boolean
}
