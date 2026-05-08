"use client"

import React from "react"

import { Alert, Box, Skeleton, Stack, Typography } from "@mui/material"

import { useLandingStats } from "@/hooks/useLandingStats"
import { fmtUSD } from "@/lib/landing-stats/format"

import apyMobSrc from "../assets/apy-mob_illus.svg?url"
import apySrc from "../assets/apy_illus.svg?url"
import feesMobSrc from "../assets/fees-mob_illus.svg?url"
import feesSrc from "../assets/fees_illus.svg?url"
import marketsMobSrc from "../assets/markets-mob_illus.svg?url"
import marketsSrc from "../assets/markets_illus.svg?url"
import tvlMobSrc from "../assets/tvl-mob_illus.svg?url"
import tvlSrc from "../assets/tvl_illus.svg?url"
import { useIframeHeight } from "../hooks/useIframeHeight"

const COLORS = {
  cardBg: "#f8f8fa",
  text: "#30313e",
  accent: "#4971ff",
  accentTint: "rgba(73, 113, 255, 0.1)",
  muted: "#858593",
}

// Card visuals switch from mobile to desktop at 1320px (independent of layout).
const BP_DESKTOP_DESIGN = "@media (min-width: 1320px)"
// Layout switches from single column to two columns at 1000px.
const BP_TWO_COL = "@media (min-width: 1000px)"

type ChartConfig = {
  desktopSrc: string
  mobileSrc: string
  /** Width in px (Figma desktop reference: 634px card) */
  widthPx: number
  topPx: number
  /** Right offset in px (Figma desktop reference: 634px card) */
  rightPx: number
  /** Top offset for mobile icon (Figma mobile reference: 124px card) */
  mobileTopPx: number
}

type Cell = {
  label: string
  value: string | null
  delta?: string | null
  subtitle?: string | null
  chart?: ChartConfig
}

function StatCard({ label, value, delta, subtitle, chart }: Cell) {
  return (
    <Box
      sx={{
        bgcolor: COLORS.cardBg,
        borderRadius: "20px",
        height: 124,
        px: "20px",
        pt: "16px",
        pb: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
        [BP_DESKTOP_DESIGN]: {
          height: 152,
          px: "24px",
          pt: "20px",
          pb: "22px",
        },
      }}
    >
      <Stack spacing={0}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: "16px",
            lineHeight: "28px",
            color: COLORS.text,
            whiteSpace: "nowrap",
            [BP_DESKTOP_DESIGN]: {
              fontSize: "18px",
              lineHeight: "32px",
            },
          }}
        >
          {label}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: "16px",
              lineHeight: "28px",
              color: COLORS.muted,
              whiteSpace: "nowrap",
              [BP_DESKTOP_DESIGN]: {
                fontSize: "18px",
                lineHeight: "32px",
              },
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      <Stack direction="row" spacing="12px" alignItems="center">
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.48px",
            color: COLORS.text,
            [BP_DESKTOP_DESIGN]: {
              fontSize: "32px",
              lineHeight: "44px",
              letterSpacing: "-0.64px",
            },
          }}
        >
          {value ?? ""}
        </Typography>
        {delta ? (
          <Box
            sx={{
              bgcolor: COLORS.accentTint,
              borderRadius: "20px",
              px: "8px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "24px",
                color: COLORS.accent,
                whiteSpace: "nowrap",
                [BP_DESKTOP_DESIGN]: {
                  fontSize: "16px",
                  lineHeight: "32px",
                },
              }}
            >
              {delta}
            </Typography>
          </Box>
        ) : null}
      </Stack>
      {chart && (
        <>
          {/* Desktop illustration — anchored to right edge (Figma reference), fixed size */}
          <Box
            sx={{
              display: "none",
              position: "absolute",
              top: `${chart.topPx}px`,
              right: `${chart.rightPx}px`,
              width: `${chart.widthPx}px`,
              bottom: 0,
              pointerEvents: "none",
              [BP_DESKTOP_DESIGN]: {
                display: "block",
              },
            }}
          >
            <Box
              component="img"
              src={chart.desktopSrc}
              alt=""
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "left top",
                display: "block",
              }}
            />
          </Box>
          {/* Mobile illustration — small icon at top-right, hidden on desktop */}
          <Box
            component="img"
            src={chart.mobileSrc}
            alt=""
            sx={{
              display: "block",
              position: "absolute",
              right: "20px",
              top: `${chart.mobileTopPx}px`,
              pointerEvents: "none",
              [BP_DESKTOP_DESIGN]: {
                display: "none",
              },
            }}
          />
        </>
      )}
    </Box>
  )
}

function formatPctDelta(pct: number | null | undefined, period: string) {
  if (pct == null || !Number.isFinite(pct)) return null
  const arrow = pct >= 0 ? "↑" : "↓"
  return `${arrow} ${Math.abs(pct).toFixed(0)}% ${period}`
}

function formatAbsUsdDelta(abs: number | null | undefined, period: string) {
  if (abs == null || !Number.isFinite(abs)) return null
  const arrow = abs >= 0 ? "↑" : "↓"
  return `${arrow} ${fmtUSD(Math.abs(abs))} ${period}`
}

function formatCountDelta(n: number, period: string) {
  if (n <= 0) return null
  return `+${n} ${period}`
}

export default function LandingStatsEmbedPage() {
  const { data, isLoading, error } = useLandingStats()
  const containerRef = useIframeHeight()

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {(error as Error).message}
      </Alert>
    )
  }

  const cells: Cell[] = [
    {
      label: "Total Value Locked",
      value: data ? fmtUSD(data.tvl) : null,
      delta: data ? formatPctDelta(data.tvlChangePct30d, "this month") : null,
      chart: {
        desktopSrc: tvlSrc.src,
        mobileSrc: tvlMobSrc.src,
        widthPx: 268,
        topPx: 20,
        rightPx: 0,
        mobileTopPx: 16,
      },
    },
    {
      label: "Average APY paid",
      subtitle: "Weighted across all markets",
      value: data ? `${data.avgAprWeighted.toFixed(1)}%` : null,
      chart: {
        desktopSrc: apySrc.src,
        mobileSrc: apyMobSrc.src,
        widthPx: 284,
        topPx: 43,
        rightPx: 0,
        mobileTopPx: 16,
      },
    },
    {
      label: "Total Fees to Lenders",
      value: data ? fmtUSD(data.totalLenderFees) : null,
      delta: data
        ? formatAbsUsdDelta(data.lenderFeesChange30dAbs, "this month")
        : null,
      chart: {
        desktopSrc: feesSrc.src,
        mobileSrc: feesMobSrc.src,
        widthPx: 244,
        topPx: 28,
        rightPx: 28,
        mobileTopPx: 19,
      },
    },
    {
      label: "Active Markets",
      value: data ? `${data.activeMarkets}` : null,
      delta: data ? formatCountDelta(data.newMarkets7d, "this week") : null,
      chart: {
        desktopSrc: marketsSrc.src,
        mobileSrc: marketsMobSrc.src,
        widthPx: 200,
        topPx: 24,
        rightPx: 24,
        mobileTopPx: 22,
      },
    },
  ]

  return (
    <Box
      ref={containerRef}
      sx={{
        // maxWidth: "1440px",
        // mx: "auto",
        p: "20px",
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
        [BP_TWO_COL]: {
          p: "12px",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        },
      }}
    >
      {cells.map((c) =>
        isLoading || c.value == null ? (
          <Skeleton
            key={c.label}
            variant="rounded"
            sx={{
              borderRadius: "20px",
              height: 124,
              [BP_DESKTOP_DESIGN]: { height: 152 },
            }}
          />
        ) : (
          <StatCard
            key={c.label}
            label={c.label}
            subtitle={c.subtitle}
            value={c.value}
            delta={c.delta}
            chart={c.chart}
          />
        ),
      )}
    </Box>
  )
}
