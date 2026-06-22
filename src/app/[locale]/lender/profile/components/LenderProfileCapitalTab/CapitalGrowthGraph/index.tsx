"use client"

import * as React from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"

import {
  LenderInterestBreakdownEntry,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import {
  LenderDailyCashFlowPoint,
  useLenderDailyStats,
} from "@/app/[locale]/lender/profile/hooks/useLenderDailyStats"
import { useLenderInterestBreakdown } from "@/app/[locale]/lender/profile/hooks/useLenderInterestBreakdown"
import {
  EChart,
  EChartOption,
  formatAxisDate,
  formatChartDate,
} from "@/components/ECharts"
import { tooltipRow, tooltipShell } from "@/components/ECharts/formatters"
import {
  formatAxisNumber,
  formatUsd,
} from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

type CapitalGrowthGraphProps = {
  lenderAddress?: `0x${string}`
  lenderData?: LenderPositionsData
}

const CHART_HEIGHT = 360

const PRINCIPAL_COLOR = COLORS.blueRibbon // Blue 800 #4971FF
// Figma "Cumulative interest" teal — no matching design token.
const INTEREST_COLOR = "#2EC4B6"
const AXIS_LABEL_COLOR = COLORS.manate
const GRID_LINE_COLOR = COLORS.athensGrey

// Interest breakdown card colors.
const IN_HAND_COLOR = "#6687FF" // Blue 700 — no design token
const NEUTRAL_BAR_COLOR = COLORS.iron // Grey 500 (in protocol / base APR)
const PENALTY_BAR_COLOR = COLORS.wildWatermelon
const BAR_TRACK_COLOR = COLORS.blackHaze // Grey 250

type InterestPanelItem = { label: string; value: number; color: string }

// One half of the interest card: a title/subtitle, a two-segment proportional
// bar, and a two-row legend (swatch + label + USD value).
const InterestPanel = ({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: [InterestPanelItem, InterestPanelItem]
}) => {
  const total = items[0].value + items[1].value
  const firstPct = total > 0 ? (items[0].value / total) * 100 : 0

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <Box>
        <Typography variant="text3" color={COLORS.blackRock} display="block">
          {title}
        </Typography>
        <Typography variant="text3" color={COLORS.matteSilver} display="block">
          {subtitle}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          height: "4px",
          borderRadius: "3px",
          overflow: "hidden",
          backgroundColor: BAR_TRACK_COLOR,
        }}
      >
        <Box sx={{ width: `${firstPct}%`, backgroundColor: items[0].color }} />
        <Box
          sx={{ width: `${100 - firstPct}%`, backgroundColor: items[1].color }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  flexShrink: 0,
                  backgroundColor: item.color,
                }}
              />
              <Typography variant="text4" color={COLORS.blackRock} noWrap>
                {item.label}
              </Typography>
            </Box>

            <Typography variant="text4" color={COLORS.blackRock}>
              {formatUsd(item.value, { compact: true })}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// "Interest status" + "Interest source" — two panels split by a vertical divider.
const InterestBreakdownCard = ({
  portfolio,
}: {
  portfolio: LenderInterestBreakdownEntry
}) => (
  <Box
    sx={{
      display: "flex",
      gap: "24px",
      padding: "14px 16px",
      borderRadius: "12px",
      border: `1px solid ${COLORS.iron}`,
      backgroundColor: "transparent",
    }}
  >
    <InterestPanel
      title="Interest status"
      subtitle="In hand vs still in protocol"
      items={[
        { label: "In hand", value: portfolio.inHandUsd, color: IN_HAND_COLOR },
        {
          label: "In protocol",
          value: portfolio.inProtocolUsd,
          color: NEUTRAL_BAR_COLOR,
        },
      ]}
    />

    <Divider
      orientation="vertical"
      flexItem
      sx={{ borderColor: COLORS.iron, height: "100%" }}
    />

    <InterestPanel
      title="Interest source"
      subtitle="Base APR vs penalty APR"
      items={[
        {
          label: "Base APR",
          value: portfolio.baseUsd,
          color: NEUTRAL_BAR_COLOR,
        },
        {
          label: "Penalty APR",
          value: portfolio.penaltyUsd,
          color: PENALTY_BAR_COLOR,
        },
      ]}
    />
  </Box>
)

// next/font loads Inter under a generated family name (applied via the body
// className), so the literal "Inter" isn't a usable canvas font. Read the
// resolved family off the DOM so the ECharts canvas matches the rest of the app.
const getChartFontFamily = () =>
  typeof window === "undefined"
    ? "Inter, sans-serif"
    : window.getComputedStyle(document.body).fontFamily || "Inter, sans-serif"

const buildOption = (
  data: LenderDailyCashFlowPoint[],
  fontFamily: string,
): EChartOption => ({
  animation: false,
  textStyle: { fontFamily },
  grid: { left: 12, right: 12, top: 60, bottom: 28, containLabel: true },
  legend: {
    top: 0,
    left: 0,
    itemWidth: 20,
    itemHeight: 8,
    itemGap: 20,
    data: ["Principal", "Cumulative interest"],
    textStyle: {
      color: COLORS.blackRock,
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 16,
    },
  },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: COLORS.blackRock,
    borderColor: COLORS.iron,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: COLORS.white,
      fontSize: 11,
    },
    formatter: (params: unknown) => {
      const items = Array.isArray(params) ? params : [params]
      const timestamp = Number(items[0]?.axisValue ?? 0)
      const point = data.find((item) => item.timestamp * 1000 === timestamp)

      if (!point) return ""

      return tooltipShell(
        formatChartDate(timestamp),
        [
          tooltipRow({
            color: PRINCIPAL_COLOR,
            label: "Principal",
            value: formatUsd(point.cumDeposits, { compact: true }),
          }),
          tooltipRow({
            color: INTEREST_COLOR,
            label: "Cumulative interest",
            value: formatUsd(point.cumInterestEarned, { compact: true }),
          }),
        ].join(""),
      )
    },
  },
  xAxis: {
    type: "time",
    boundaryGap: ["1%", "1%"],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: AXIS_LABEL_COLOR,
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 16,
      formatter: (value: number) => formatAxisDate(value),
    },
    splitLine: { show: false },
  },
  yAxis: [
    {
      // Left axis — Principal.
      type: "value",
      position: "left",
      name: "Principal ($)",
      nameGap: 16,
      nameTextStyle: {
        color: AXIS_LABEL_COLOR,
        fontSize: 8,
        fontWeight: 500,
        lineHeight: 12,
        align: "left",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: AXIS_LABEL_COLOR,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 16,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: {
        lineStyle: { color: GRID_LINE_COLOR, type: "solid" },
      },
    },
    {
      // Right axis — Cumulative interest.
      type: "value",
      position: "right",
      name: "Interest ($)",
      nameGap: 16,
      nameTextStyle: {
        color: AXIS_LABEL_COLOR,
        fontSize: 8,
        fontWeight: 500,
        lineHeight: 12,
        align: "right",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: AXIS_LABEL_COLOR,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 16,
        formatter: (value: number) => `$${formatAxisNumber(value)}`,
      },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: "Principal",
      type: "line",
      yAxisIndex: 0,
      smooth: true,
      symbol: "none",
      lineStyle: { color: PRINCIPAL_COLOR, width: 2 },
      itemStyle: { color: PRINCIPAL_COLOR },
      data: data.map((point) => [point.timestamp * 1000, point.cumDeposits]),
    },
    {
      name: "Cumulative interest",
      type: "line",
      yAxisIndex: 1,
      smooth: true,
      symbol: "none",
      lineStyle: { color: INTEREST_COLOR, width: 2, type: "dashed" },
      itemStyle: { color: INTEREST_COLOR },
      data: data.map((point) => [
        point.timestamp * 1000,
        point.cumInterestEarned,
      ]),
    },
  ],
})

export const CapitalGrowthGraph = ({
  lenderAddress,
  lenderData,
}: CapitalGrowthGraphProps) => {
  const { data, isLoading } = useLenderDailyStats(lenderAddress)
  const points = data ?? []

  const { data: interestBreakdown } = useLenderInterestBreakdown({
    lenderAddress,
    marketIds: lenderData?.marketIds ?? [],
    priceMap: lenderData?.priceMap ?? {},
    decimalsMap: lenderData?.decimalsMap ?? {},
  })
  const portfolio: LenderInterestBreakdownEntry =
    interestBreakdown?.portfolio ?? {
      baseUsd: 0,
      penaltyUsd: 0,
      totalInterestUsd: 0,
      inHandUsd: 0,
      inProtocolUsd: 0,
    }

  const fontFamily = React.useMemo(() => getChartFontFamily(), [])
  const option = React.useMemo(
    () => buildOption(points, fontFamily),
    [points, fontFamily],
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <Skeleton
          variant="rounded"
          height={CHART_HEIGHT}
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )
    }

    if (points.length === 0) {
      return (
        <Box
          sx={{
            alignItems: "center",
            color: COLORS.santasGrey,
            display: "flex",
            fontSize: 12,
            height: CHART_HEIGHT,
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          No capital growth history for this lender.
        </Box>
      )
    }

    return (
      <EChart
        option={option}
        height={CHART_HEIGHT}
        ariaLabel="Capital growth: principal vs cumulative interest"
      />
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/*
        Backing card. Height is left to content (chart's fixed height + padding)
        so the bottom padding is preserved — giving the inner box height: 100%
        would let the chart fill the padded area and eat the bottom padding.
      */}
      <Box
        sx={{
          padding: "18px 20px 0px",
          borderRadius: "16px",
          backgroundColor: COLORS.hintOfRed,
        }}
      >
        {renderContent()}
      </Box>

      <InterestBreakdownCard portfolio={portfolio} />
    </Box>
  )
}
