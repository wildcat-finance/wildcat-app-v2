"use client"

import { useState, useMemo, useCallback } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import {
  CHART_COLORS,
  ChartsGrid,
  ChartCardStyle,
  ChartHeader,
  TimeRangeButton,
} from "./style"
import type { DailyFlowPoint } from "../../hooks/useMarketDailyFlows"

const TIME_RANGES: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  All: 99999,
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
  label,
  symbol,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  symbol: string
}) {
  if (!active || !payload?.length) return null

  const fmt = (v: number) => {
    const abs = Math.abs(v)
    return `${abs.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} ${symbol}`
  }

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
        {label}
      </Typography>
      {payload
        .filter((p) => p.value !== 0)
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
  const [range, setRange] = useState("All")

  const filtered = useMemo(
    () => dailyFlows.slice(-(TIME_RANGES[range] ?? 99999)),
    [dailyFlows, range],
  )

  const tickInterval = useMemo(
    () => Math.max(1, Math.floor(filtered.length / (isMobile ? 6 : 12))),
    [filtered.length, isMobile],
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

  return (
    <Box sx={ChartsGrid(isMobile)}>
      <Box sx={ChartCardStyle}>
        <Box sx={ChartHeader}>
          <Box>
            <Typography
              variant="text4"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {t("lenderMarketDetails.analytics.charts.dailyFlows")}
            </Typography>
            <Typography
              variant="text4"
              sx={{
                color: COLORS.santasGrey,
                fontSize: "11px",
                display: "block",
              }}
            >
              {t("lenderMarketDetails.analytics.charts.dailyFlowsDesc")}
            </Typography>
          </Box>
          {renderTimeRanges()}
        </Box>
        <Box sx={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <ComposedChart
              data={filtered}
              stackOffset="sign"
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="dateShort"
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtK}
                width={48}
              />
              <Tooltip content={<FlowTooltip symbol={symbol} />} />
              <Bar
                dataKey="dailyDeposit"
                stackId="flows"
                fill={CHART_COLORS.deposit}
                opacity={0.8}
                name="Deposits"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="dailyWithdrawalNeg"
                stackId="flows"
                fill={CHART_COLORS.withdrawal}
                opacity={0.8}
                name="Withdrawals"
                radius={[0, 0, 2, 2]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box sx={ChartCardStyle}>
        <Box sx={ChartHeader}>
          <Box>
            <Typography
              variant="text4"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {t("lenderMarketDetails.analytics.charts.cumulativeNetFlow")}
            </Typography>
            <Typography
              variant="text4"
              sx={{
                color: COLORS.santasGrey,
                fontSize: "11px",
                display: "block",
              }}
            >
              {t("lenderMarketDetails.analytics.charts.cumulativeNetFlowDesc")}
            </Typography>
          </Box>
          {renderTimeRanges()}
        </Box>
        <Box sx={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart
              data={filtered}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS.netFlow}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS.netFlow}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="dateShort"
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtK}
                width={48}
              />
              <Tooltip content={<FlowTooltip symbol={symbol} />} />
              <Area
                type="monotone"
                dataKey="netFlow"
                stroke={CHART_COLORS.netFlow}
                strokeWidth={2}
                fill="url(#netFlowGrad)"
                name="Net Flow"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  )
}
