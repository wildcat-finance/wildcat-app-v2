"use client"

import * as React from "react"

import type { ECharts } from "echarts/core"

import { EChart } from "./EChart"
import { buildCategoryBarOption } from "./options"
import {
  CategoryBarSeries,
  CategoryBarValueLabel,
  ChartMarkLine,
  ChartTooltipFormatter,
  ChartValueFormatter,
  EChartOption,
} from "./types"

type CategoryBarChartProps<T extends object> = {
  data: T[]
  categoryKey: keyof T & string
  series: CategoryBarSeries<T>[]
  height?: number | string
  ariaLabel?: string
  horizontal?: boolean
  stacked?: boolean
  formatValue?: ChartValueFormatter
  yAxisWidth?: number
  showDataZoom?: boolean
  showLegend?: boolean
  showWatermark?: boolean
  valueAxisVisible?: boolean
  barBorderRadius?: number | number[]
  categoryLabelFontFamily?: string
  tooltipFormatter?: ChartTooltipFormatter<T>
  visualMap?: EChartOption["visualMap"]
  markLine?: ChartMarkLine
  valueLabel?: CategoryBarValueLabel<T>
  showExportActions?: boolean
  csvContent?: string
  csvFileName?: string
  imageFileName?: string
  exportButtonVariant?: "icon" | "text"
  onReady?: (instance: ECharts | null) => void
}

export const CategoryBarChart = <T extends object>({
  data,
  categoryKey,
  series,
  height,
  ariaLabel,
  horizontal,
  stacked,
  formatValue,
  yAxisWidth,
  showDataZoom,
  showLegend,
  showWatermark,
  valueAxisVisible,
  barBorderRadius,
  categoryLabelFontFamily,
  tooltipFormatter,
  visualMap,
  markLine,
  valueLabel,
  showExportActions,
  csvContent,
  csvFileName,
  imageFileName,
  exportButtonVariant,
  onReady,
}: CategoryBarChartProps<T>) => {
  const option = React.useMemo(
    () =>
      buildCategoryBarOption({
        data,
        categoryKey,
        series,
        horizontal,
        stacked,
        formatValue,
        yAxisWidth,
        showDataZoom,
        showLegend,
        showWatermark,
        valueAxisVisible,
        barBorderRadius,
        categoryLabelFontFamily,
        tooltipFormatter,
        visualMap,
        markLine,
        valueLabel,
      }),
    [
      data,
      categoryKey,
      series,
      horizontal,
      stacked,
      formatValue,
      yAxisWidth,
      showDataZoom,
      showLegend,
      showWatermark,
      valueAxisVisible,
      barBorderRadius,
      categoryLabelFontFamily,
      tooltipFormatter,
      visualMap,
      markLine,
      valueLabel,
    ],
  )

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel={ariaLabel}
      showExportActions={showExportActions}
      csvContent={csvContent}
      csvFileName={csvFileName}
      imageFileName={imageFileName}
      exportButtonVariant={exportButtonVariant}
      onReady={onReady}
    />
  )
}
