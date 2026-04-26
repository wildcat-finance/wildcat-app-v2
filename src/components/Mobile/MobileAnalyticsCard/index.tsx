"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"

export type MobileAnalyticsCardProps = {
  /** Optional URL — when provided the whole card is a clickable link. */
  href?: string
  /** Primary label (left of header row, e.g. market name). */
  title: React.ReactNode
  /** Optional secondary line under the title (e.g. borrower address chip). */
  titleSub?: React.ReactNode
  /** Optional element rendered at the right of the header (status / type chip). */
  headerRight?: React.ReactNode
  /** Big primary value (right column). */
  headlineValue?: React.ReactNode
  /** Tiny grey label under the headline. */
  headlineLabel?: React.ReactNode
  /** Color override for the headline (defaults to blackRock). */
  headlineColor?: string
  /** Small key/value pairs below the divider. */
  rows?: Array<{
    label: React.ReactNode
    value: React.ReactNode
  }>
  /** Optional progress bar + label rendered under the rows. */
  progress?: {
    /** Percentage value 0–100 (clamped). */
    value: number
    /** Color of the bar fill. */
    color?: string
    /** Optional label rendered to the right of the bar. */
    label?: React.ReactNode
    /** Optional label rendered to the left of the bar. */
    leftLabel?: React.ReactNode
  }
}

/**
 * One mobile-friendly card used to render a row from an analytics table on
 * small viewports. Layout:
 *
 *   [titleSub  title       ][headerRight]
 *                              headlineValue
 *                              headlineLabel
 *   ─────────────────────────────────────
 *   row.label                  row.value
 *   row.label                  row.value
 *   ─────────────────────────────────────
 *   progress.leftLabel  progress.label
 *   ████████░░░░░░░░░
 *
 * Each section is optional. If `href` is provided the whole card is wrapped in
 * a Next.js Link.
 */
export const MobileAnalyticsCard = ({
  href,
  title,
  titleSub,
  headerRight,
  headlineValue,
  headlineLabel,
  headlineColor,
  rows,
  progress,
}: MobileAnalyticsCardProps) => {
  const showHeader = Boolean(headerRight) || Boolean(titleSub) || Boolean(title)
  const showRows = rows && rows.length > 0
  const showProgress = Boolean(progress)
  const showDivider = (showRows || showProgress) && showHeader

  const body = (
    <Box
      sx={{
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.athensGrey}`,
        borderRadius: "12px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {showHeader && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="text2Highlighted"
              sx={{
                display: "block",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                color: COLORS.blackRock,
              }}
            >
              {title}
            </Typography>
            {titleSub && (
              <Box sx={{ marginTop: "4px" }}>{titleSub}</Box>
            )}
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "2px",
              flexShrink: 0,
            }}
          >
            {headerRight}
            {headlineValue !== undefined && headlineValue !== null && (
              <Typography
                variant="text2Highlighted"
                sx={{
                  fontWeight: 700,
                  color: headlineColor ?? COLORS.blackRock,
                }}
              >
                {headlineValue}
              </Typography>
            )}
            {headlineLabel && (
              <Typography variant="text4" color={COLORS.santasGrey}>
                {headlineLabel}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {showDivider && (
        <Box sx={{ height: "1px", backgroundColor: COLORS.athensGrey }} />
      )}

      {showRows && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {rows!.map((row, idx) => (
            <Box
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Typography variant="text4" color={COLORS.santasGrey}>
                {row.label}
              </Typography>
              <Typography
                variant="text3"
                sx={{
                  color: COLORS.blackRock,
                  textAlign: "right",
                  minWidth: 0,
                }}
              >
                {row.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {showProgress && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Box
            sx={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              backgroundColor: COLORS.athensGrey,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${Math.max(0, Math.min(100, progress!.value))}%`,
                height: "100%",
                backgroundColor: progress!.color ?? COLORS.ultramarineBlue,
                borderRadius: "2px",
                transition: "width 0.2s ease",
              }}
            />
          </Box>
          {(progress!.leftLabel || progress!.label) && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="text4" color={COLORS.santasGrey}>
                {progress!.leftLabel}
              </Typography>
              <Typography
                variant="text4"
                sx={{
                  color: progress!.color ?? COLORS.ultramarineBlue,
                  fontWeight: 600,
                }}
              >
                {progress!.label}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )

  if (href) {
    return (
      <Link
        href={href}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        {body}
      </Link>
    )
  }

  return body
}
