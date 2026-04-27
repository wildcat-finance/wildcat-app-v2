"use client"

import * as React from "react"

import { EChart } from "./EChart"
import { WatermarkPlacement, buildTimeSeriesOption } from "./options"
import {
  ChartMarkPoint,
  ChartTooltipFormatter,
  ChartValueFormatter,
  TimeSeriesConfig,
} from "./types"

type TimeSeriesChartProps<T extends object> = {
  data: T[]
  series: TimeSeriesConfig<T>[]
  timestampKey?: keyof T & string
  height?: number | string
  ariaLabel?: string
  formatValue?: ChartValueFormatter
  yAxisFormatter?: ChartValueFormatter
  showLegend?: boolean
  showDataZoom?: boolean
  yAxisName?: string
  tooltipFormatter?: ChartTooltipFormatter<T>
  markPoints?: ChartMarkPoint[]
  watermarkPlacement?: WatermarkPlacement
  csvContent?: string
  csvFileName?: string
  imageFileName?: string
  showExportActions?: boolean
  exportButtonVariant?: "icon" | "text"
}

export const TimeSeriesChart = <T extends object>({
  data,
  series,
  timestampKey,
  height,
  ariaLabel,
  formatValue,
  yAxisFormatter,
  showLegend,
  showDataZoom,
  yAxisName,
  tooltipFormatter,
  markPoints,
  watermarkPlacement,
  csvContent,
  csvFileName,
  imageFileName,
  showExportActions,
  exportButtonVariant,
}: TimeSeriesChartProps<T>) => {
  const option = React.useMemo(
    () =>
      buildTimeSeriesOption({
        data,
        series,
        timestampKey,
        formatValue,
        yAxisFormatter,
        showLegend,
        showDataZoom,
        yAxisName,
        tooltipFormatter,
        markPoints,
        watermarkPlacement,
      }),
    [
      data,
      series,
      timestampKey,
      formatValue,
      yAxisFormatter,
      showLegend,
      showDataZoom,
      yAxisName,
      tooltipFormatter,
      markPoints,
      watermarkPlacement,
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
