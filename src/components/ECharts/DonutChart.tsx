"use client"

import * as React from "react"

import { EChart } from "./EChart"
import { buildDonutOption } from "./options"
import { ChartValueFormatter, DonutChartItem } from "./types"

type DonutChartProps = {
  data: DonutChartItem[]
  colors: string[]
  height?: number | string
  ariaLabel?: string
  formatValue?: ChartValueFormatter
  centerLabel?: {
    primary: string
    secondary?: string
  }
  showLegend?: boolean
}

export const DonutChart = ({
  data,
  colors,
  height,
  ariaLabel,
  formatValue,
  centerLabel,
  showLegend,
}: DonutChartProps) => {
  const formatValueRef = React.useRef(formatValue)
  formatValueRef.current = formatValue
  const stableFormatValue = React.useCallback<ChartValueFormatter>(
    (value) => (formatValueRef.current ?? ((v: number) => String(v)))(value),
    [],
  )

  const primary = centerLabel?.primary
  const secondary = centerLabel?.secondary
  const stableCenterLabel = React.useMemo(
    () => (primary !== undefined ? { primary, secondary } : undefined),
    [primary, secondary],
  )

  const option = React.useMemo(
    () =>
      buildDonutOption({
        data,
        colors,
        formatValue: stableFormatValue,
        centerLabel: stableCenterLabel,
        showLegend,
      }),
    [data, colors, stableFormatValue, stableCenterLabel, showLegend],
  )

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />
}
