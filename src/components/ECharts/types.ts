import type { EChartsCoreOption } from "echarts/core"

export type EChartOption = EChartsCoreOption

export type ChartValueFormatter = (value: number) => string

export type ChartTooltipParam = {
  axisValue?: string | number
  name?: string
  marker?: string
  seriesName?: string
  value?: unknown
  color?: string
  data?: unknown
}

export type ChartTooltipFormatter<T extends object = object> = (
  params: ChartTooltipParam[],
  data: T[],
) => string

export type ChartMarkPoint = {
  timestamp: number
  value: number
  name: string
  color?: string
}

export type ChartMarkLine = {
  value: number
  name: string
  color?: string
}

export type TimeSeriesKind = "line" | "area" | "bar"

export type TimeSeriesConfig<T extends object> = {
  key: keyof T & string
  name: string
  color: string
  kind?: TimeSeriesKind
  stack?: string
  yAxisIndex?: number
  opacity?: number
}

export type CategoryBarSeries<T extends object> = {
  key: keyof T & string
  name: string
  color: string
  stack?: string
  colors?: (item: T, index: number) => string
}

export type DonutChartItem = {
  name: string
  value: number
  color?: string
  tooltipRows?: Array<{
    label: string
    value: string
  }>
}
