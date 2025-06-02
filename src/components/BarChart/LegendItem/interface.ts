import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"

export type LegendItemProps = {
  type?: "default" | "expandable" | "extended" | "noBorderWithDivider"
  chartItem: Pick<
    MarketBarChartItem,
    "label" | "legendDotClassName" | "color" | "value" | "asset"
  >
  expandable?: boolean
  children?: React.ReactNode
}
