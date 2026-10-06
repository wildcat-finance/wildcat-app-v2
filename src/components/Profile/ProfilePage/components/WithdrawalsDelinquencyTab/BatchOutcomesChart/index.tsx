"use client"

import * as React from "react"

import { BorrowerWithdrawalBatchSummary } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { ChartBody } from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/ChartStates"
import {
  CHART_AXIS_TEXT_COLOR,
  ChartRange,
  DEFAULT_CHART_RANGE,
  filterByRange,
  getInterFontFamily,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/constants"
import { MarketChartShell } from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/MarketChartShell"
import {
  interTooltipRow,
  interTooltipShell,
} from "@/app/[locale]/lender/profile/components/LenderProfileMarketsTab/MarketCard/charts/tooltip"
import {
  EChartOption,
  formatAxisDate,
  formatChartDate,
} from "@/components/ECharts"
import {
  formatAxisNumber,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

const BATCH_COLORS: Record<BorrowerWithdrawalBatchSummary["status"], string> = {
  paid: "#28CAB7",
  "paid-late": COLORS.iron,
  unpaid: COLORS.wildWatermelon,
  pending: COLORS.iron,
}

const STATUS_LABEL: Record<BorrowerWithdrawalBatchSummary["status"], string> = {
  paid: "Fully paid",
  "paid-late": "Paid late",
  unpaid: "Unpaid",
  pending: "Pending",
}

type BatchPoint = BorrowerWithdrawalBatchSummary & { timestamp: number }

const AXIS_LABEL_STYLE = {
  color: CHART_AXIS_TEXT_COLOR,
  fontSize: 11,
} as const

const buildOption = (batches: BatchPoint[]): EChartOption => {
  const fontFamily = getInterFontFamily()

  return {
    animation: false,
    grid: { left: 4, right: 8, top: 8, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: COLORS.blackRock,
      borderColor: COLORS.iron,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: COLORS.white, fontFamily, fontSize: 11 },
      formatter: (params: unknown) => {
        const point = (Array.isArray(params) ? params[0] : params) as {
          data?: BatchPoint & { color?: string }
        }
        const batch = point?.data
        if (!batch) return ""

        return interTooltipShell(
          `${batch.label} · ${formatChartDate(batch.expiryTimestamp * 1000)}`,
          [
            interTooltipRow({
              color: BATCH_COLORS[batch.status],
              label: "Outcome",
              value: STATUS_LABEL[batch.status],
            }),
            interTooltipRow({
              color: COLORS.santasGrey,
              label: "Requested",
              value: formatUsd(batch.requested, { compact: true }),
            }),
            interTooltipRow({
              color: COLORS.wildWatermelon,
              label: "Shortfall",
              value: formatUsd(batch.shortfall, { compact: true }),
            }),
          ].join(""),
        )
      },
    },
    xAxis: {
      type: "time",
      boundaryGap: ["2%", "2%"],
      axisLine: { lineStyle: { color: COLORS.black01 } },
      axisTick: { show: false },
      axisLabel: {
        ...AXIS_LABEL_STYLE,
        fontFamily,
        formatter: (value: number) => formatAxisDate(value),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...AXIS_LABEL_STYLE,
        fontFamily,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: {
        lineStyle: { color: COLORS.athensGrey, type: "dashed", opacity: 0.9 },
      },
    },
    series: [
      {
        type: "bar",
        barWidth: 6,
        data: batches.map((batch) => ({
          value: [batch.expiryTimestamp * 1000, batch.requested],
          itemStyle: {
            color: BATCH_COLORS[batch.status],
            borderRadius: [3, 3, 0, 0],
          },
          ...batch,
        })),
      },
    ],
  }
}

export const BatchOutcomesChart = ({
  batches,
  isLoading,
}: {
  batches: BorrowerWithdrawalBatchSummary[]
  isLoading: boolean
}) => {
  const [range, setRange] = React.useState<ChartRange>(DEFAULT_CHART_RANGE)

  const points = React.useMemo(
    () =>
      filterByRange(
        batches.map((batch) => ({
          ...batch,
          timestamp: batch.expiryTimestamp,
        })),
        range,
      ),
    [batches, range],
  )
  const option = React.useMemo(() => buildOption(points), [points])

  return (
    <MarketChartShell
      title="Batch outcomes"
      subtitle="Requested USD value per expired batch, bucketed by final outcome"
      range={range}
      onRangeChange={setRange}
      legend={[
        { label: "Fully paid", color: BATCH_COLORS.paid, variant: "square" },
        {
          label: "Paid late",
          color: BATCH_COLORS["paid-late"],
          variant: "square",
        },
        { label: "Unpaid", color: BATCH_COLORS.unpaid, variant: "square" },
      ]}
    >
      <ChartBody
        isLoading={isLoading}
        isEmpty={points.length === 0}
        emptyMessage="No expired withdrawal batches for this borrower yet."
        option={option}
        ariaLabel="Batch outcomes"
      />
    </MarketChartShell>
  )
}
