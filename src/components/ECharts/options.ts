import * as echarts from "echarts/core"

import wildcatLogoUrl from "@/assets/icons/logo_black.svg?url"
import { COLORS } from "@/theme/colors"

import {
  formatAxisDate,
  formatChartDate,
  formatCompactNumber,
  tooltipRow,
  tooltipShell,
} from "./formatters"
import { CHART_PALETTE } from "./palette"
import {
  CategoryBarSeries,
  ChartMarkLine,
  ChartMarkPoint,
  ChartTooltipFormatter,
  ChartValueFormatter,
  DonutChartItem,
  EChartOption,
  TimeSeriesConfig,
} from "./types"

type TooltipParam = Parameters<ChartTooltipFormatter>[0][number]

const fontFamily = "monospace"
const watermarkImage =
  typeof wildcatLogoUrl === "string"
    ? wildcatLogoUrl
    : (wildcatLogoUrl as { src: string }).src

type WatermarkPlacement = "cartesian" | "dense" | "donut"

export const ECHART_COLORS = {
  axis: CHART_PALETTE.ui.axis,
  text: CHART_PALETTE.ui.text,
  grid: CHART_PALETTE.ui.grid,
  tooltipBg: CHART_PALETTE.ui.tooltipBg,
  tooltipBorder: CHART_PALETTE.ui.tooltipBorder,
}

export const getChartWatermark = (
  placement: WatermarkPlacement = "cartesian",
): EChartOption["graphic"] => ({
  type: "image",
  z: 0,
  silent: true,
  style: {
    image: watermarkImage,
    width: placement === "dense" ? 240 : 280,
    height: placement === "dense" ? 80 : 93,
    opacity: 0.05,
  },
  left: "center",
  top: "middle",
})

export const getDataZoom = (enabled: boolean, axis = "x") => {
  if (!enabled) return []

  const axisKey = axis === "y" ? "yAxisIndex" : "xAxisIndex"

  return [
    {
      type: "inside",
      [axisKey]: 0,
      start: 0,
      end: 100,
      filterMode: "filter",
    },
    {
      type: "slider",
      [axisKey]: 0,
      start: 0,
      end: 100,
      height: axis === "x" ? 26 : undefined,
      width: axis === "y" ? 18 : undefined,
      right: axis === "y" ? 6 : 12,
      left: axis === "x" ? 12 : undefined,
      bottom: axis === "x" ? 8 : 24,
      top: axis === "y" ? 24 : undefined,
      borderColor: COLORS.black01,
      fillerColor: CHART_PALETTE.ui.zoomFill,
      backgroundColor: COLORS.blackRock006,
      dataBackground: {
        lineStyle: { color: COLORS.greySuit, opacity: 0.75 },
        areaStyle: { color: COLORS.greySuit, opacity: 0.18 },
      },
      selectedDataBackground: {
        lineStyle: { color: CHART_PALETTE.semantic.primary, opacity: 0.9 },
        areaStyle: { color: CHART_PALETTE.semantic.primary, opacity: 0.2 },
      },
      handleStyle: {
        borderColor: COLORS.blackRock,
        color: COLORS.white,
      },
      moveHandleStyle: {
        color: COLORS.black01,
      },
      emphasis: {
        handleStyle: {
          borderColor: CHART_PALETTE.semantic.primary,
          color: COLORS.white,
        },
        moveHandleStyle: {
          color: CHART_PALETTE.ui.zoomFill,
        },
      },
      textStyle: {
        color: COLORS.santasGrey,
        fontFamily,
        fontSize: 10,
      },
      labelFormatter:
        axis === "x"
          ? (value: string | number) => formatAxisDate(Number(value))
          : undefined,
    },
  ]
}

export const baseGrid = (hasDataZoom: boolean): EChartOption["grid"] => ({
  left: 12,
  right: 16,
  top: 36,
  bottom: hasDataZoom ? 60 : 12,
  containLabel: true,
})

export const baseTooltip = {
  trigger: "axis",
  confine: true,
  backgroundColor: ECHART_COLORS.tooltipBg,
  borderColor: ECHART_COLORS.tooltipBorder,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: {
    color: COLORS.white,
    fontFamily,
    fontSize: 11,
  },
  axisPointer: {
    type: "cross",
    lineStyle: {
      color: CHART_PALETTE.semantic.primary,
      width: 1,
      opacity: 0.7,
    },
    crossStyle: {
      color: CHART_PALETTE.semantic.primary,
      opacity: 0.7,
    },
  },
}

export const baseLegend = {
  type: "scroll",
  top: 0,
  right: 8,
  itemWidth: 10,
  itemHeight: 6,
  textStyle: {
    color: COLORS.santasGrey,
    fontFamily,
    fontSize: 11,
  },
}

const baseAxis = {
  axisLine: { lineStyle: { color: COLORS.black01 } },
  axisTick: { show: false },
  axisLabel: {
    color: ECHART_COLORS.axis,
    fontFamily,
    fontSize: 10,
  },
  splitLine: {
    lineStyle: {
      color: ECHART_COLORS.grid,
      type: "dashed",
      opacity: 0.9,
    },
  },
}

const getNumericValue = (value: unknown) => {
  if (Array.isArray(value)) return Number(value[1] ?? 0)
  if (typeof value === "number") return value
  if (value && typeof value === "object" && "value" in value) {
    return Number((value as { value: unknown }).value ?? 0)
  }
  return Number(value ?? 0)
}

const getTimeSeriesTooltipFormatter =
  (formatValue: ChartValueFormatter) => (params: TooltipParam[]) => {
    const items = Array.isArray(params) ? params : [params]
    const headerValue = Number(items[0]?.axisValue ?? items[0]?.value ?? 0)
    const rows = items
      .filter((item) => Number.isFinite(getNumericValue(item.value)))
      .sort(
        (left, right) =>
          Math.abs(getNumericValue(right.value)) -
          Math.abs(getNumericValue(left.value)),
      )
      .map((item) =>
        tooltipRow({
          color: String(item.color ?? CHART_PALETTE.semantic.primary),
          label: item.seriesName ?? "",
          value: formatValue(getNumericValue(item.value)),
        }),
      )
      .join("")

    return tooltipShell(formatChartDate(headerValue), rows)
  }

export const buildTimeSeriesOption = <T extends object>({
  data,
  series,
  timestampKey = "timestamp" as keyof T & string,
  formatValue = formatCompactNumber,
  yAxisFormatter = formatValue,
  showLegend = true,
  showDataZoom = true,
  yAxisName,
  tooltipFormatter,
  markPoints = [],
}: {
  data: T[]
  series: TimeSeriesConfig<T>[]
  timestampKey?: keyof T & string
  formatValue?: ChartValueFormatter
  yAxisFormatter?: ChartValueFormatter
  showLegend?: boolean
  showDataZoom?: boolean
  yAxisName?: string
  tooltipFormatter?: ChartTooltipFormatter<T>
  markPoints?: ChartMarkPoint[]
}): EChartOption => {
  const hasDataZoom = showDataZoom && data.length > 1

  return {
    animation: false,
    graphic: getChartWatermark(),
    grid: baseGrid(hasDataZoom),
    tooltip: {
      ...baseTooltip,
      formatter: tooltipFormatter
        ? (params: TooltipParam[]) => {
            const items = Array.isArray(params) ? params : [params]
            return tooltipFormatter(items, data)
          }
        : getTimeSeriesTooltipFormatter(formatValue),
    },
    legend: showLegend ? baseLegend : undefined,
    dataZoom: getDataZoom(hasDataZoom),
    xAxis: {
      ...baseAxis,
      type: "time",
      boundaryGap: ["0%", "0%"],
      axisLabel: {
        ...baseAxis.axisLabel,
        formatter: (value: number) => formatAxisDate(value),
      },
    },
    yAxis: {
      ...baseAxis,
      type: "value",
      name: yAxisName,
      nameTextStyle: {
        color: COLORS.santasGrey,
        fontFamily,
        fontSize: 10,
      },
      axisLabel: {
        ...baseAxis.axisLabel,
        formatter: (value: number) => yAxisFormatter(value),
      },
    },
    series: series.map((item, index) => {
      const isArea = item.kind === "area"
      const isBar = item.kind === "bar"

      return {
        name: item.name,
        type: isBar ? "bar" : "line",
        stack: item.stack,
        yAxisIndex: item.yAxisIndex,
        symbol: "none",
        smooth: !isBar,
        connectNulls: true,
        barMaxWidth: isBar ? 18 : undefined,
        itemStyle: { color: item.color },
        lineStyle: {
          color: item.color,
          width: isBar ? 0 : 2,
        },
        areaStyle: isArea
          ? {
              opacity: item.opacity ?? 0.22,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: item.color },
                { offset: 1, color: COLORS.white01 },
              ]),
            }
          : undefined,
        emphasis: {
          focus: "series",
        },
        markPoint:
          index === series.length - 1 && markPoints.length > 0
            ? {
                symbol: "pin",
                symbolSize: 42,
                label: {
                  color: COLORS.white,
                  fontFamily,
                  fontSize: 9,
                  formatter: ({ name }: { name: string }) => name,
                },
                itemStyle: {
                  color: CHART_PALETTE.semantic.primary,
                },
                data: markPoints.map((point) => ({
                  name: point.name,
                  coord: [point.timestamp * 1000, point.value],
                  itemStyle: {
                    color: point.color ?? CHART_PALETTE.semantic.primary,
                  },
                })),
              }
            : undefined,
        data: data.map((point) => [
          Number(point[timestampKey]) * 1000,
          Number(point[item.key] ?? 0),
        ]),
      }
    }),
  }
}

export const buildCategoryBarOption = <T extends object>({
  data,
  categoryKey,
  series,
  horizontal = false,
  stacked = false,
  formatValue = formatCompactNumber,
  yAxisWidth,
  showDataZoom = false,
  barBorderRadius,
  categoryLabelFontFamily,
  tooltipFormatter,
  visualMap,
  markLine,
}: {
  data: T[]
  categoryKey: keyof T & string
  series: CategoryBarSeries<T>[]
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
}): EChartOption => {
  const hasDataZoom = showDataZoom && data.length > 1
  const categoryAxis = {
    ...baseAxis,
    type: "category",
    data: data.map((item) => String(item[categoryKey] ?? "")),
    axisLabel: {
      ...baseAxis.axisLabel,
      color: horizontal ? COLORS.blackRock : COLORS.santasGrey,
      fontFamily: categoryLabelFontFamily ?? baseAxis.axisLabel.fontFamily,
      overflow: "truncate",
      width: horizontal ? yAxisWidth ?? 140 : 80,
    },
    splitLine: { show: false },
  }
  const valueAxis = {
    ...baseAxis,
    type: "value",
    axisLabel: {
      ...baseAxis.axisLabel,
      formatter: (value: number) => formatValue(value),
    },
  }

  const valueRows = data.reduce<Record<string, Record<string, number>>>(
    (acc, row) => {
      acc[String(row[categoryKey] ?? "")] = series.reduce<
        Record<string, number>
      >((seriesAcc, item) => {
        seriesAcc[item.name] = Number(row[item.key] ?? 0)
        return seriesAcc
      }, {})
      return acc
    },
    {},
  )

  return {
    animation: false,
    graphic: getChartWatermark(horizontal ? "dense" : "cartesian"),
    grid: {
      left: horizontal ? yAxisWidth ?? 150 : 12,
      right: 16,
      top: 32,
      bottom: hasDataZoom ? 60 : 12,
      containLabel: !horizontal,
    },
    legend: series.length > 1 ? baseLegend : undefined,
    tooltip: {
      ...baseTooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: TooltipParam[]) => {
        const items = Array.isArray(params) ? params : [params]
        if (tooltipFormatter) return tooltipFormatter(items, data)

        const category = String(items[0]?.axisValue ?? items[0]?.name ?? "")
        const values = valueRows[category] ?? {}
        const rows = items
          .filter((item) => (values[item.seriesName ?? ""] ?? 0) !== 0)
          .map((item) =>
            tooltipRow({
              color: String(item.color ?? CHART_PALETTE.semantic.primary),
              label: item.seriesName ?? "",
              value: formatValue(values[item.seriesName ?? ""] ?? 0),
            }),
          )
          .join("")

        return tooltipShell(category, rows)
      },
    },
    visualMap,
    dataZoom: getDataZoom(hasDataZoom, horizontal ? "y" : "x"),
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [
      ...series.map((item) => ({
        name: item.name,
        type: "bar",
        stack: stacked ? item.stack ?? "total" : item.stack,
        barMaxWidth: 26,
        itemStyle: {
          color: visualMap ? undefined : item.color,
          borderRadius:
            barBorderRadius ?? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]),
        },
        emphasis: {
          focus: "series",
        },
        data: data.map((row, rowIndex) => ({
          value: Number(row[item.key] ?? 0),
          itemStyle: {
            color: visualMap
              ? undefined
              : item.colors?.(row, rowIndex) ?? item.color,
          },
        })),
      })),
      ...(markLine && !horizontal
        ? [
            {
              name: markLine.name,
              type: "line",
              symbol: "none",
              showSymbol: false,
              silent: true,
              triggerLineEvent: false,
              tooltip: { show: false },
              lineStyle: {
                color: markLine.color ?? CHART_PALETTE.semantic.primary,
                type: "dashed",
                width: 1,
              },
              emphasis: {
                disabled: true,
              },
              data: data.map(() => markLine.value),
            },
          ]
        : []),
    ],
  }
}

export const buildDonutOption = ({
  data,
  colors,
  formatValue = formatCompactNumber,
  centerLabel,
  showLegend = true,
}: {
  data: DonutChartItem[]
  colors: string[]
  formatValue?: ChartValueFormatter
  centerLabel?: {
    primary: string
    secondary?: string
  }
  showLegend?: boolean
}): EChartOption => ({
  animation: false,
  color: colors,
  legend: showLegend
    ? {
        ...baseLegend,
        top: "bottom",
        left: "center",
        right: undefined,
      }
    : undefined,
  graphic: [
    getChartWatermark("donut"),
    ...(centerLabel
      ? [
          {
            type: "text",
            z: 1000,
            left: "center",
            top: "45%",
            style: {
              text: centerLabel.primary,
              fill: COLORS.blackRock,
              fontFamily,
              fontSize: 18,
              fontWeight: 600,
              textAlign: "center",
            },
          },
          ...(centerLabel.secondary
            ? [
                {
                  type: "text",
                  z: 1000,
                  left: "center",
                  top: "55%",
                  style: {
                    text: centerLabel.secondary,
                    fill: COLORS.santasGrey,
                    fontFamily,
                    fontSize: 10,
                    textAlign: "center",
                  },
                },
              ]
            : []),
        ]
      : []),
  ],
  tooltip: {
    ...baseTooltip,
    trigger: "item",
    formatter: (param: TooltipParam) => {
      const value = getNumericValue(param.value)
      const percent =
        param && typeof param === "object" && "percent" in param
          ? Number((param as { percent: number }).percent)
          : 0

      return tooltipShell(
        String(param.name ?? ""),
        [
          tooltipRow({
            color: String(param.color ?? CHART_PALETTE.semantic.primary),
            label: "Interest",
            value: `${formatValue(value)} (${percent.toFixed(1)}%)`,
          }),
          ...(
            (param.data as DonutChartItem | undefined)?.tooltipRows ?? []
          ).map((row) =>
            tooltipRow({
              color: String(param.color ?? CHART_PALETTE.semantic.primary),
              label: row.label,
              value: row.value,
            }),
          ),
        ].join(""),
      )
    },
  },
  series: [
    {
      type: "pie",
      radius: ["52%", "78%"],
      center: ["50%", "50%"],
      avoidLabelOverlap: true,
      minAngle: 2,
      itemStyle: {
        borderColor: COLORS.white,
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      emphasis: {
        scale: true,
        scaleSize: 4,
      },
      data: data.map((item, index) => ({
        ...item,
        name: item.name,
        value: item.value,
        itemStyle: { color: item.color ?? colors[index % colors.length] },
      })),
    },
  ],
})
