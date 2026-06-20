import { useCallback } from "react"

import { Box, Typography } from "@mui/material"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderDailyStats } from "@/app/[locale]/lender/profile/hooks/useLenderDailyStats"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

// types

type LenderProfileOverviewSummary = {
  lenderAddress: `0x${string}` | undefined
  lenderData?: LenderPositionsData
}

type SummaryColumn = {
  label: string
  caption: string
  value: string
  trend: number | null
}

// constants

const WEEK_SECONDS = 7 * 86_400

// functions

const formatEffectiveYield = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0.00%"
  }

  return value < 0.01 ? "<0.01%" : formatPercent(value)
}

// helper components

const TrendLabel = ({
  trend,
  isMobile,
}: {
  trend: number
  isMobile?: boolean
}) => {
  const positiveTrend = trend >= 0

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: { xs: 0, md: "3.5px" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
        {/* place for the arrow icon */}

        <Typography
          variant={isMobile ? "mobText4" : "text3"}
          color={positiveTrend ? COLORS.ultramarineBlue : COLORS.wildWatermelon}
        >
          {positiveTrend ? "+" : ""}
          {trend.toFixed(2)}% this week
        </Typography>
      </Box>
    </Box>
  )
}

export const LenderProfileOverviewSummary = ({
  lenderAddress,
  lenderData,
}: LenderProfileOverviewSummary) => {
  const isMobile = useMobileResolution()
  const { data: dailyStats } = useLenderDailyStats(lenderAddress)

  const profileInfo = lenderData?.profile

  const getWeekOverWeekInfo = useCallback(
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
      trend: null,
    },
    {
      label: "Total deposited",
      caption: "all-time deposits",
      value: formatUsd(profileInfo?.totalDeposited ?? 0, { compact: true }),
      trend: getWeekOverWeekInfo((point) => point.cumDeposits),
    },
    {
      label: "Cumulative interest earned",
      caption: "since first deposit",
      value: formatUsd(profileInfo?.totalInterestEarned ?? 0, {
        compact: true,
      }),
      trend: getWeekOverWeekInfo((point) => point.cumInterestEarned),
    },
    {
      label: "Cumulative interest ratio",
      caption: "interest / total deposited",
      value: formatEffectiveYield(profileInfo?.effectiveYield),
      trend: null,
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        padding: { xs: 0, md: "14px 0 12px" },
        flexDirection: { xs: "column", md: "row" },
        border: { xs: "none", md: `1px solid ${COLORS.athensGrey}` },
        borderRadius: { xs: 0, md: "16px" },
        backgroundColor: COLORS.white,
        overflow: "hidden",
      }}
    >
      {columns.map((column, index) => (
        <Box
          key={column.label}
          sx={{
            flex: 1,
            minWidth: 0,
            padding: { xs: "10px 0", md: "0 16px" },
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            alignItems: { xs: "center", md: "flex-start" },
            justifyContent: { xs: "space-between" },
            borderTop: {
              xs: index === 0 ? "none" : `1px solid ${COLORS.athensGrey}`,
              md: "none",
            },
            borderLeft: {
              xs: "none",
              md: index === 0 ? "none" : `1px solid ${COLORS.athensGrey}`,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.blackRock}
            >
              {column.label}
            </Typography>

            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.matteSilver}
            >
              {column.caption}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "flex-end",
              gap: { xs: 0, md: "6px" },
            }}
          >
            <Typography variant={isMobile ? "mobText2" : "title3"}>
              {column.value}
            </Typography>

            {column.trend !== null && Number.isFinite(column.trend) && (
              <TrendLabel isMobile={isMobile} trend={column.trend} />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
