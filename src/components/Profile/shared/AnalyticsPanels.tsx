"use client"

import { ReactNode } from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const EmptyPanel = ({ message }: { message: string }) => (
  <Box
    sx={{
      border: `1px dashed ${COLORS.iron}`,
      borderRadius: "12px",
      padding: "24px",
      textAlign: "center",
    }}
  >
    <Typography variant="text2" color={COLORS.santasGrey}>
      {message}
    </Typography>
  </Box>
)

export const AnalyticsSectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) => (
  <Box
    sx={{
      border: `1px solid ${COLORS.athensGrey}`,
      borderRadius: "16px",
      backgroundColor: COLORS.white,
      padding: "24px",
    }}
  >
    <Typography
      variant="title2"
      display="block"
      sx={{ marginBottom: subtitle ? "6px" : "24px" }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        variant="text3"
        color={COLORS.santasGrey}
        display="block"
        sx={{ marginBottom: "24px" }}
      >
        {subtitle}
      </Typography>
    )}
    <Box>{children}</Box>
  </Box>
)
