"use client"

import * as React from "react"

import { EChart } from "./EChart"
import { buildCategoryBarOption } from "./options"
import {
  CategoryBarSeries,
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
  barBorderRadius?: number | number[]
  categoryLabelFontFamily?: string
  tooltipFormatter?: ChartTooltipFormatter<T>
  visualMap?: EChartOption["visualMap"]
  markLine?: ChartMarkLine
  showExportActions?: boolean
  csvContent?: string
  csvFileName?: string
  imageFileName?: string
  exportButtonVariant?: "icon" | "text"
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
  barBorderRadius,
  categoryLabelFontFamily,
  tooltipFormatter,
  visualMap,
  markLine,
  showExportActions,
  csvContent,
  csvFileName,
  imageFileName,
  exportButtonVariant,
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
        barBorderRadius,
        categoryLabelFontFamily,
        tooltipFormatter,
        visualMap,
        markLine,
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
      barBorderRadius,
      categoryLabelFontFamily,
      tooltipFormatter,
      visualMap,
      markLine,
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
    />
  )
}
