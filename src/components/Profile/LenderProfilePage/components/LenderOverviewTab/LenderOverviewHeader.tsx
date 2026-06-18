"use client"

import * as React from "react"

import { Box, Divider, SvgIcon, Typography } from "@mui/material"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderDailyStats } from "@/app/[locale]/lender/profile/hooks/useLenderDailyStats"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

type LenderOverviewHeaderProps = {
  lenderAddress: `0x${string}` | undefined
  data?: LenderPositionsData
}

const WEEK_SECONDS = 7 * 86_400

const formatEffectiveYield = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0.00%"
  }

  return value < 0.01 ? "<0.01%" : formatPercent(value)
}

type SummaryColumn = {
  label: string
  caption: string
  value: string
  trendPct: number | null
}

const TrendArrowIcon = ({ positive }: { positive: boolean }) => (
  <SvgIcon
    viewBox="0 0 16 16"
    sx={{
      fontSize: "15px",
      transform: positive ? "none" : "scaleY(-1)",
    }}
  >
    <path
      d="M4.5 11.5 11 5M6 5h5v5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
)

const TrendLabel = ({ pct }: { pct: number }) => {
  const positive = pct >= 0
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          color: COLORS.ultramarineBlue,
        }}
      >
        <TrendArrowIcon positive={positive} />

        <Typography
          variant="text3"
          color={positive ? COLORS.ultramarineBlue : COLORS.wildWatermelon}
        >
          {positive ? "+" : ""}
          {pct.toFixed(2)}%
        </Typography>
      </Box>

      <Typography
        variant="text3"
        color={positive ? COLORS.ultramarineBlue : COLORS.wildWatermelon}
      >
        this week
      </Typography>
    </Box>
  )
}

export const LenderOverviewHeader = ({
  lenderAddress,
  data,
}: LenderOverviewHeaderProps) => {
  const { data: dailyStats } = useLenderDailyStats(lenderAddress)

  const profileInfo = data?.profile

  const weekOverWeek = React.useCallback(
    (pick: (point: NonNullable<typeof dailyStats>[number]) => number) => {
      const points = dailyStats ?? []
      if (points.length === 0) return null

      const latest = points[points.length - 1]
      const cutoff = latest.timestamp - WEEK_SECONDS
      const past = [...points].reverse().find((p) => p.timestamp <= cutoff)

      const latestValue = pick(latest)
      const pastValue = past ? pick(past) : 0
      if (!pastValue || pastValue <= 0) return null

      return ((latestValue - pastValue) / pastValue) * 100
    },
    [dailyStats],
  )

  const columns: SummaryColumn[] = [
    {
      label: "Total balance",
      caption: "across all markets",
      value: formatUsd(profileInfo?.totalBalance ?? 0, { compact: true }),
      trendPct: null,
    },
    {
      label: "Total deposited",
      caption: "all-time deposits",
      value: formatUsd(profileInfo?.totalDeposited ?? 0, { compact: true }),
      trendPct: weekOverWeek((point) => point.cumDeposits),
    },
    {
      label: "Cumulative interest earned",
      caption: "since first deposit",
      value: formatUsd(profileInfo?.totalInterestEarned ?? 0, {
        compact: true,
      }),
      trendPct: weekOverWeek((point) => point.cumInterestEarned),
    },
    {
      label: "Cumulative interest ratio",
      caption: "interest / total deposited",
      value: formatEffectiveYield(profileInfo?.effectiveYield),
      trendPct: null,
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        padding: "14px 16px 12px",
        flexDirection: { xs: "column", md: "row" },
        border: `1px solid ${COLORS.athensGrey}`,
        borderRadius: "16px",
        backgroundColor: COLORS.white,
        overflow: "hidden",
      }}
    >
      {columns.map((column, index) => (
        <>
          <Box
            key={column.label}
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              borderTop: {
                xs: index === 0 ? "none" : `1px solid ${COLORS.athensGrey}`,
                md: "none",
              },
              // borderLeft: {
              //   xs: "none",
              //   md: index === 0 ? "none" : `1px solid ${COLORS.athensGrey}`,
              // },
            }}
          >
            <Typography variant="text3" color={COLORS.blackRock}>
              {column.label}
            </Typography>

            <Typography variant="text3" color={COLORS.matteSilver}>
              {column.caption}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: "6px",
                flexWrap: "wrap",
                marginTop: "23px",
              }}
            >
              <Typography variant="title3">{column.value}</Typography>

              {column.trendPct !== null && Number.isFinite(column.trendPct) && (
                <TrendLabel pct={column.trendPct} />
              )}
            </Box>
          </Box>

          {index !== 3 && (
            <Divider
              orientation="vertical"
              sx={{ width: "1px", height: "100%", mr: "16px" }}
            />
          )}
        </>
      ))}
    </Box>
  )
}
