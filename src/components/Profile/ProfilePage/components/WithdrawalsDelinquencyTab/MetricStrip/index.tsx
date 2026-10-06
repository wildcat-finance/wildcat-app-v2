"use client"

import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type MetricItem = {
  label: string
  value: string
  // Muted "(…)" suffix rendered next to the value (e.g. a percentage share).
  suffix?: string
  tooltip?: string
}

const StripDivider = () => (
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

// Single bordered strip of label/value cells split by dividers — the KPI row
// used across the borrower profile analytics sections.
export const MetricStrip = ({
  items,
  isLoading,
}: {
  items: MetricItem[]
  isLoading?: boolean
}) => (
  <Box
    sx={{
      border: `1px solid ${COLORS.iron}`,
      borderRadius: "12px",
      padding: "14px 0",
      display: "flex",
      flexDirection: { xs: "column", md: "row" },
    }}
  >
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 && <StripDivider />}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            padding: "0 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Typography variant="text3" sx={{ opacity: 0.8 }} noWrap>
              {item.label}
            </Typography>
            {item.tooltip && <TooltipButton value={item.tooltip} />}
          </Box>

          {isLoading ? (
            <Skeleton variant="text" width={72} height={32} />
          ) : (
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <Typography variant="text1">{item.value}</Typography>
              {item.suffix && (
                <Typography variant="text3" color={COLORS.santasGrey}>
                  ({item.suffix})
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </React.Fragment>
    ))}
  </Box>
)
