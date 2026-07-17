"use client"

import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

const BAR_TRACK_COLOR = COLORS.blackHaze
const BAR_FILL_COLOR = COLORS.ultramarineBlue

// A 1px rule that stretches vertically between cards on desktop and turns into a
// full-width horizontal rule when the cards stack on mobile.
const CardDivider = () => (
  <Box
    sx={{
      backgroundColor: COLORS.iron,
      flexShrink: 0,
      alignSelf: "stretch",
      width: { xs: "100%", md: "1px" },
      height: { xs: "1px", md: "auto" },
    }}
  />
)

const ProgressBar = ({ fillPct }: { fillPct: number }) => (
  <Box
    sx={{
      display: "flex",
      height: "4px",
      borderRadius: "3px",
      overflow: "hidden",
      backgroundColor: BAR_TRACK_COLOR,
    }}
  >
    <Box
      sx={{
        width: `${Math.max(0, Math.min(100, fillPct))}%`,
        backgroundColor: BAR_FILL_COLOR,
      }}
    />
  </Box>
)

// One card column: title (+ optional subtitle) pinned to the top, the rest of
// the content pinned to the bottom so values/bars line up across cards.
const SummaryCard = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: "16px",
      padding: "0 16px",
    }}
  >
    <Box>
      <Typography variant="text3" color={COLORS.blackRock} display="block">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="text3" color={COLORS.matteSilver} display="block">
          {subtitle}
        </Typography>
      )}
    </Box>

    <Box>{children}</Box>
  </Box>
)

const SummaryValue = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="title3" display="block">
    {children}
  </Typography>
)

export const BorrowerOverviewSummary = ({
  analytics,
  isLoading,
}: {
  analytics?: BorrowerProfileAnalytics
  isLoading: boolean
}) => {
  const totalDebt = analytics?.totalDebt ?? 0
  const totalCapacity = analytics?.totalCapacity ?? 0
  const totalRepaid = analytics?.totalRepaid ?? 0
  const totalBorrowed = analytics?.totalBorrowed ?? 0

  const utilization = totalCapacity > 0 ? (totalDebt / totalCapacity) * 100 : 0
  const repaidPct = totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0

  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.iron}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        padding: "14px 0 12px",
      }}
    >
      {/* Total debt */}
      <SummaryCard
        title="Total debt"
        subtitle={`out of ${formatUsd(totalCapacity, {
          compact: true,
        })} capacity`}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          {isLoading ? (
            <Skeleton variant="text" width={64} height={32} />
          ) : (
            <SummaryValue>
              {formatUsd(totalDebt, { compact: true })}
            </SummaryValue>
          )}
          <Typography
            variant="text4"
            sx={{ color: COLORS.blackRock, opacity: 0.8, whiteSpace: "nowrap" }}
          >
            {formatPercent(utilization)} utilized
          </Typography>
        </Box>
        <ProgressBar fillPct={utilization} />
      </SummaryCard>

      <CardDivider />

      {/* Debt-weighted APR */}
      <SummaryCard title="Debt-weighted APR">
        {isLoading ? (
          <Skeleton variant="text" width={80} height={32} />
        ) : (
          <SummaryValue>{formatPercent(analytics?.avgApr ?? 0)}</SummaryValue>
        )}
      </SummaryCard>

      <CardDivider />

      {/* Lifetime flow */}
      <SummaryCard title="Lifetime flow">
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <Box>
            <Typography
              variant="text4"
              sx={{ color: COLORS.blackRock, opacity: 0.8 }}
              display="block"
            >
              Repaid
            </Typography>
            {isLoading ? (
              <Skeleton variant="text" width={56} height={32} />
            ) : (
              <SummaryValue>
                {formatUsd(totalRepaid, { compact: true })}
              </SummaryValue>
            )}
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="text4"
              sx={{ color: COLORS.blackRock, opacity: 0.8 }}
              display="block"
            >
              Borrowed
            </Typography>
            {isLoading ? (
              <Skeleton
                variant="text"
                width={56}
                height={32}
                sx={{ ml: "auto" }}
              />
            ) : (
              <SummaryValue>
                {formatUsd(totalBorrowed, { compact: true })}
              </SummaryValue>
            )}
          </Box>
        </Box>
        <ProgressBar fillPct={repaidPct} />
      </SummaryCard>
    </Box>
  )
}
