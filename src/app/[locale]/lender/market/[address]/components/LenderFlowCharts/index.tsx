"use client"

import { useState, useMemo, useCallback } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import {
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import Expand from "@/assets/icons/expand_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import {
  CHART_COLORS,
  ChartsGrid,
  ChartCardStyle,
  ChartHeader,
  ChartDescription,
  TimeRangeButton,
  ChartActionButton,
  ExpandDialogPaper,
  ExpandDialogContent,
} from "./style"
import type { DailyFlowPoint } from "../../hooks/useMarketDailyFlows"

const DAY = 86_400

const TIME_RANGES: Record<string, number | null> = {
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
  "1y": 365 * DAY,
  All: null,
}

function fmtAxisDate(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function fmtK(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(v % 1 === 0 ? 0 : 1)
}

function FlowTooltip({
  active,
  payload,
  symbol,
}: {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: DailyFlowPoint
  }>
  symbol: string
}) {
  if (!active || !payload?.length) return null

  const fmt = (v: number) => {
    const abs = Math.abs(v)
    return `${abs.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} ${symbol}`
  }

  const header = payload[0]?.payload?.date ?? ""

  return (
    <Box
      sx={{
        backgroundColor: COLORS.blackRock,
        border: `1px solid ${COLORS.iron}`,
        borderRadius: "6px",
        padding: "8px 12px",
        fontFamily: "monospace",
        fontSize: "11px",
      }}
    >
      <Typography
        sx={{
          color: COLORS.santasGrey,
          marginBottom: "4px",
          fontSize: "11px",
          fontFamily: "monospace",
        }}
      >
        {header}
      </Typography>
      {payload
        .filter((p) => p.value !== 0 && !p.name.startsWith("__"))
        .map((p) => (
          <Box
            key={p.name}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "2px",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                backgroundColor: p.color,
              }}
            />
            <Typography
              component="span"
              sx={{ color: COLORS.santasGrey, fontSize: "11px" }}
            >
              {p.name}:
            </Typography>
            <Typography
              component="span"
              sx={{
                color: COLORS.white,
                fontWeight: 600,
                fontSize: "11px",
              }}
            >
              {fmt(p.value)}
            </Typography>
          </Box>
        ))}
    </Box>
  )
}

const AXIS_STYLE = {
  fontFamily: "monospace",
  fontSize: 10,
  fill: COLORS.santasGrey,
}

const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: COLORS.athensGrey,
}

function CrossIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 13.348 18.654 20 20 18.65 13.348 12 20 5.346 18.65 4 12 10.652 5.346 4 4 5.35 10.652 12 4 18.654 5.35 20z"
      />
    </svg>
  )
}

type ChartBodyProps = {
  data: DailyFlowPoint[]
  symbol: string
  ticks: number[] | undefined
  minTickGap: number
}

function DailyFlowsChartBody({
  data,
  symbol,
  ticks,
  minTickGap,
}: ChartBodyProps) {
  return (
    <ResponsiveContainer>
      <ComposedChart
        data={data}
        stackOffset="sign"
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtAxisDate}
          minTickGap={minTickGap}
        />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtK}
          width={48}
        />
        <Tooltip content={<FlowTooltip symbol={symbol} />} />
        {/* Separate stackIds so the two negative bars render side-by-side
            (grouped) rather than stacking and double-counting outflow. */}
        <Bar
          dataKey="dailyDeposit"
          stackId="deposits"
          fill={CHART_COLORS.deposit}
          opacity={0.85}
          name="Deposits"
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="dailyWithdrawalRequestedNeg"
          stackId="requested"
          fill={CHART_COLORS.withdrawalRequested}
          opacity={0.85}
          name="Withdrawals Requested"
          radius={[0, 0, 2, 2]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="dailyWithdrawalExecutedNeg"
          stackId="executed"
          fill={CHART_COLORS.withdrawalExecuted}
          opacity={0.85}
          name="Withdrawals Executed"
          radius={[0, 0, 2, 2]}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function CumulativeNetFlowChartBody({
  data,
  symbol,
  ticks,
  minTickGap,
  gradientId,
}: ChartBodyProps & { gradientId: string }) {
  return (
    <ResponsiveContainer>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={CHART_COLORS.netFlowExecuted}
              stopOpacity={0.22}
            />
            <stop
              offset="95%"
              stopColor={CHART_COLORS.netFlowExecuted}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtAxisDate}
          minTickGap={minTickGap}
        />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtK}
          width={48}
        />
        <Tooltip content={<FlowTooltip symbol={symbol} />} />
        {/* Blue gradient area = settled net flow (executed). The band
            stacked on top (invisible base at netFlowRequested + tinted
            pendingBand) renders the gap between the two cumulative
            curves, which is the outstanding pending withdrawal amount.
            The thin line at netFlowRequested is the band's lower edge. */}
        <Area
          type="monotone"
          dataKey="netFlowExecuted"
          stroke={CHART_COLORS.netFlowExecuted}
          strokeWidth={1.25}
          fill={`url(#${gradientId})`}
          name="Net Flow (Executed)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="netFlowRequested"
          stackId="band"
          stroke="none"
          fillOpacity={0}
          activeDot={false}
          legendType="none"
          name="__bandBase"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="pendingBand"
          stackId="band"
          stroke="none"
          fill={CHART_COLORS.pendingBand}
          fillOpacity={0.35}
          activeDot={false}
          name="Pending Withdrawals"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="netFlowRequested"
          stroke={CHART_COLORS.netFlowRequested}
          strokeWidth={1.25}
          strokeOpacity={0.7}
          dot={false}
          activeDot={{
            r: 3,
            stroke: CHART_COLORS.netFlowRequested,
            fill: CHART_COLORS.netFlowRequested,
          }}
          name="Net Flow (Requested)"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

type FocusedChart = "flows" | "cumulative" | null

export const LenderFlowCharts = ({
  dailyFlows,
  isLoading,
  symbol,
}: {
  dailyFlows: DailyFlowPoint[]
  isLoading: boolean
  symbol: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const [range, setRange] = useState<string>("All")
  const [focused, setFocused] = useState<FocusedChart>(null)

  const filtered = useMemo(() => {
    const lookback = TIME_RANGES[range]
    if (lookback == null) return dailyFlows
    const cutoff = Math.floor(Date.now() / 1000) - lookback
    return dailyFlows.filter((p) => p.timestamp >= cutoff)
  }, [dailyFlows, range])

  const cardMinTickGap = isMobile ? 24 : 28
  const modalMinTickGap = isMobile ? 40 : 60
  const cardTickCount = isMobile ? 4 : 6
  const modalTickCount = isMobile ? 5 : 9

  const makeTicks = useCallback(
    (count: number) => {
      if (filtered.length < 2) return undefined
      const start = filtered[0].timestamp
      const end = filtered[filtered.length - 1].timestamp
      return Array.from({ length: count }, (_, i) =>
        Math.round(start + ((end - start) * i) / (count - 1)),
      )
    },
    [filtered],
  )

  const cardTicks = useMemo(
    () => makeTicks(cardTickCount),
    [makeTicks, cardTickCount],
  )
  const modalTicks = useMemo(
    () => makeTicks(modalTickCount),
    [makeTicks, modalTickCount],
  )

  const renderTimeRanges = useCallback(
    () => (
      <Box sx={{ display: "flex", gap: "2px", flexShrink: 0 }}>
        {Object.keys(TIME_RANGES).map((r) => (
          <Button
            key={r}
            onClick={() => setRange(r)}
            sx={TimeRangeButton(range === r)}
          >
            {r}
          </Button>
        ))}
      </Box>
    ),
    [range],
  )

  if (isLoading) {
    return (
      <Box sx={ChartsGrid(isMobile)}>
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
        />
      </Box>
    )
  }

  if (dailyFlows.length === 0) return null

  const renderExpandButton = (chart: Exclude<FocusedChart, null>) => (
    <IconButton
      onClick={() => setFocused(chart)}
      aria-label={t("lenderMarketDetails.analytics.charts.expand")}
      sx={ChartActionButton}
    >
      <Expand />
    </IconButton>
  )

  const focusedCopy: Record<
    Exclude<FocusedChart, null>,
    { title: string; description: string }
  > = {
    flows: {
      title: t("lenderMarketDetails.analytics.charts.dailyFlows"),
      description: t("lenderMarketDetails.analytics.charts.dailyFlowsDesc"),
    },
    cumulative: {
      title: t("lenderMarketDetails.analytics.charts.cumulativeNetFlow"),
      description: t(
        "lenderMarketDetails.analytics.charts.cumulativeNetFlowDesc",
      ),
    },
  }
  const focusedTitle = focused ? focusedCopy[focused].title : ""
  const focusedDescription = focused ? focusedCopy[focused].description : ""

  return (
    <>
      <Box sx={ChartsGrid(isMobile)}>
        <Box sx={ChartCardStyle}>
          <Box sx={ChartHeader}>
            <Typography
              variant="text4"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {t("lenderMarketDetails.analytics.charts.dailyFlows")}
            </Typography>
            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {renderTimeRanges()}
              {renderExpandButton("flows")}
            </Box>
          </Box>
          <Typography variant="text4" sx={ChartDescription}>
            {t("lenderMarketDetails.analytics.charts.dailyFlowsDesc")}
          </Typography>
          <Box sx={{ width: "100%", height: 220 }}>
            <DailyFlowsChartBody
              data={filtered}
              symbol={symbol}
              ticks={cardTicks}
              minTickGap={cardMinTickGap}
            />
          </Box>
        </Box>

        <Box sx={ChartCardStyle}>
          <Box sx={ChartHeader}>
            <Typography
              variant="text4"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {t("lenderMarketDetails.analytics.charts.cumulativeNetFlow")}
            </Typography>
            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {renderTimeRanges()}
              {renderExpandButton("cumulative")}
            </Box>
          </Box>
          <Typography variant="text4" sx={ChartDescription}>
            {t("lenderMarketDetails.analytics.charts.cumulativeNetFlowDesc")}
          </Typography>
          <Box sx={{ width: "100%", height: 220 }}>
            <CumulativeNetFlowChartBody
              data={filtered}
              symbol={symbol}
              ticks={cardTicks}
              minTickGap={cardMinTickGap}
              gradientId="netFlowGrad"
            />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={focused !== null}
        onClose={() => setFocused(null)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: ExpandDialogPaper }}
      >
        <Box sx={ExpandDialogContent}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <Typography
              variant="text2"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {focusedTitle}
            </Typography>
            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {renderTimeRanges()}
              <IconButton
                onClick={() => setFocused(null)}
                aria-label={t("lenderMarketDetails.analytics.charts.close")}
                sx={ChartActionButton}
              >
                <CrossIcon />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="text4" sx={ChartDescription}>
            {focusedDescription}
          </Typography>
          <Box sx={{ width: "100%", height: isMobile ? 360 : 520 }}>
            {focused === "flows" && (
              <DailyFlowsChartBody
                data={filtered}
                symbol={symbol}
                ticks={modalTicks}
                minTickGap={modalMinTickGap}
              />
            )}
            {focused === "cumulative" && (
              <CumulativeNetFlowChartBody
                data={filtered}
                symbol={symbol}
                ticks={modalTicks}
                minTickGap={modalMinTickGap}
                gradientId="netFlowGradExpanded"
              />
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  )
}
