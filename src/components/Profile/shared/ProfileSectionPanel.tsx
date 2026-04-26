"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

type ProfileSectionPanelProps = {
  title: string
  subtitle?: string
  count?: number
  actions?: React.ReactNode
  children: React.ReactNode
}

/**
 * Section wrapper used inside the lender / borrower profile tabs. On mobile it
 * becomes a single white card so that the heading sits with the content
 * instead of floating on the page background; on desktop it's a transparent
 * container so the existing layout is unchanged.
 */
export const ProfileSectionPanel = ({
  title,
  subtitle,
  count,
  actions,
  children,
}: ProfileSectionPanelProps) => (
  <Box
    sx={{
      backgroundColor: { xs: COLORS.white, md: "transparent" },
      border: { xs: `1px solid ${COLORS.athensGrey}`, md: "none" },
      borderRadius: { xs: "14px", md: 0 },
      padding: { xs: "16px", md: 0 },
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "8px",
        marginBottom: subtitle ? "6px" : { xs: "12px", md: "24px" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
          minWidth: 0,
        }}
      >
        <Typography variant="title2" display="block">
          {title}
        </Typography>
        {typeof count === "number" && count > 0 && (
          <Typography variant="text3" color={COLORS.santasGrey}>
            · {count}
          </Typography>
        )}
      </Box>
      {actions}
    </Box>
    {subtitle && (
      <Typography
        variant="text3"
        color={COLORS.santasGrey}
        display="block"
        sx={{ marginBottom: { xs: "12px", md: "24px" } }}
      >
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
)
