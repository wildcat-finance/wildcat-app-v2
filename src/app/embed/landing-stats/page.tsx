"use client"

import React, { useEffect } from "react"

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

const COLORS = {
  cardBg: "#f8f8fa",
  text: "#30313e",
  accent: "#4971ff",
  accentTint: "rgba(73, 113, 255, 0.1)",
  muted: "#858593",
}

type ChartConfig = {
  desktopSrc: string
  mobileSrc: string
  /** Left offset as % of card width (Figma desktop reference: 634px) */
  leftPct: number
  topPx: number
  /** Width as % of card width */
  widthPct: number
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
        height: { xs: 124, md: 152 },
        px: { xs: "20px", md: "24px" },
        pt: { xs: "16px", md: "20px" },
        pb: { xs: "16px", md: "22px" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Stack spacing={0}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: { xs: "16px", md: "18px" },
            lineHeight: { xs: "28px", md: "32px" },
            color: COLORS.text,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: { xs: "16px", md: "18px" },
              lineHeight: { xs: "28px", md: "32px" },
              color: COLORS.muted,
              whiteSpace: "nowrap",
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
            fontSize: { xs: "24px", md: "32px" },
            lineHeight: { xs: "32px", md: "44px" },
            letterSpacing: { xs: "-0.48px", md: "-0.64px" },
            color: COLORS.text,
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
                fontSize: { xs: "14px", md: "16px" },
                lineHeight: { xs: "24px", md: "32px" },
                color: COLORS.accent,
                whiteSpace: "nowrap",
              }}
            >
              {delta}
            </Typography>
          </Box>
        ) : null}
      </Stack>
      {chart && (
        <>
          {/* Desktop illustration — percentage-based position, hidden on mobile */}
          <Box
            component="img"
            src={chart.desktopSrc}
            alt=""
            sx={{
              display: { xs: "none", md: "block" },
              position: "absolute",
              left: `${chart.leftPct}%`,
              top: `${chart.topPx}px`,
              width: `${chart.widthPct}%`,
              height: "auto",
              pointerEvents: "none",
            }}
          />
          {/* Mobile illustration — small icon at top-right, hidden on desktop */}
          <Box
            component="img"
            src={chart.mobileSrc}
            alt=""
            sx={{
              display: { xs: "block", md: "none" },
              position: "absolute",
              right: "20px",
              top: `${chart.mobileTopPx}px`,
              pointerEvents: "none",
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

  useEffect(() => {
    const postHeight = () => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage({ type: "iframe-height", height }, "*")
    }

    window.addEventListener("load", postHeight)

    const ro = new ResizeObserver(postHeight)
    ro.observe(document.body)

    postHeight()

    return () => {
      window.removeEventListener("load", postHeight)
      ro.disconnect()
    }
  }, [])

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
        leftPct: 57.73, // 366 / 634
        topPx: 20,
        widthPct: 42.27, // 268 / 634
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
        leftPct: 55.21, // 350 / 634
        topPx: 43,
        widthPct: 44.79, // 284 / 634
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
        leftPct: 57.1, // 362 / 634
        topPx: 28,
        widthPct: 38.49, // 244 / 634
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
        leftPct: 64.67, // 410 / 634
        topPx: 24,
        widthPct: 31.55, // 200 / 634
        mobileTopPx: 22,
      },
    },
  ]

  return (
    <Box
      sx={{
        maxWidth: "1440px",
        mx: "auto",
        p: { xs: "20px", md: "12px" },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        gap: "12px",
      }}
    >
      {cells.map((c) =>
        isLoading || c.value == null ? (
          <Skeleton
            key={c.label}
            variant="rounded"
            sx={{ borderRadius: "20px", height: { xs: 124, md: 152 } }}
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
