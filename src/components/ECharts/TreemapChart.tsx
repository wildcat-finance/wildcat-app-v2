"use client"

import * as React from "react"

import type * as echarts from "echarts/core"

import { EChart } from "./EChart"
import { buildTreemapOption } from "./options"
import { TreemapChartItem } from "./types"

type TreemapChartProps = {
  data: TreemapChartItem[]
  height?: number | string
  ariaLabel?: string
}

type TreemapSeriesModel = {
  getDataParams: (
    dataIndex: number,
    dataType?: string,
    element?: unknown,
  ) => unknown
}

type EChartsWithTreemapModel = {
  getModel: () => {
    getSeriesByType?: (type: "treemap") => TreemapSeriesModel[]
  }
}

const patchedTreemapSeries = new WeakSet<TreemapSeriesModel>()

const patchTreemapDataParams = (instance: echarts.ECharts) => {
  const treemapSeries = (instance as unknown as EChartsWithTreemapModel)
    .getModel()
    .getSeriesByType?.("treemap")

  treemapSeries?.forEach((seriesModel) => {
    if (patchedTreemapSeries.has(seriesModel)) return

    const getDataParams = seriesModel.getDataParams.bind(seriesModel)

    seriesModel.getDataParams = (dataIndex: number) => getDataParams(dataIndex)

    patchedTreemapSeries.add(seriesModel)
  })
}

export const TreemapChart = ({
  data,
  height,
  ariaLabel,
}: TreemapChartProps) => {
  const option = React.useMemo(() => buildTreemapOption({ data }), [data])

  return (
    <EChart
      option={option}
      height={height}
      ariaLabel={ariaLabel}
      onOptionApplied={patchTreemapDataParams}
      lazyUpdate={false}
    />
  )
}
