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
  const option = React.useMemo(
    () =>
      buildDonutOption({ data, colors, formatValue, centerLabel, showLegend }),
    [data, colors, formatValue, centerLabel, showLegend],
  )

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />
}
