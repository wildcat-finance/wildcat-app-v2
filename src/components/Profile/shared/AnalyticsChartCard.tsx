"use client"

import * as React from "react"

import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"

import Expand from "@/assets/icons/expand_icon.svg"
import {
  ANALYTICS_TIME_RANGES,
  AnalyticsTimeRange,
} from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

import {
  ChartActionButtonStyle,
  ChartCardStyle,
  ChartDescriptionStyle,
  ChartHeaderStyle,
  ExpandDialogContentStyle,
  ExpandDialogPaperStyle,
  TimeRangeChipStyle,
} from "./chartStyle"

type AnalyticsChartCardProps = {
  title: string
  description?: string
  timeRange?: AnalyticsTimeRange
  onTimeRangeChange?: (range: AnalyticsTimeRange) => void
  showTimeRange?: boolean
  cardHeight?: number
  dialogHeight?: number
  children: (args: { isExpanded: boolean }) => React.ReactNode
}

const CrossIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 13.348 18.654 20 20 18.65 13.348 12 20 5.346 18.65 4 12 10.652 5.346 4 4 5.35 10.652 12 4 18.654 5.35 20z"
    />
  </svg>
)

export const AnalyticsChartCard = ({
  title,
  description,
  timeRange,
  onTimeRangeChange,
  showTimeRange = false,
  cardHeight = 220,
  dialogHeight = 520,
  children,
}: AnalyticsChartCardProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const renderTimeRangeChips = () => {
    if (!showTimeRange || !onTimeRangeChange) return null

    return (
      <Box sx={{ display: "flex", gap: "2px", flexShrink: 0 }}>
        {ANALYTICS_TIME_RANGES.map((option) => (
          <Button
            key={option.value}
            onClick={() => onTimeRangeChange(option.value)}
            sx={TimeRangeChipStyle(timeRange === option.value)}
          >
            {option.label}
          </Button>
        ))}
      </Box>
    )
  }

  return (
    <>
      <Box sx={ChartCardStyle}>
        <Box sx={ChartHeaderStyle}>
          <Typography
            variant="text4"
            sx={{ fontWeight: 600, color: COLORS.blackRock }}
          >
            {title}
          </Typography>

          <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {renderTimeRangeChips()}
            <IconButton
              onClick={() => setIsExpanded(true)}
              aria-label="Expand chart"
              sx={ChartActionButtonStyle}
            >
              <Expand />
            </IconButton>
          </Box>
        </Box>

        {description && (
          <Typography variant="text4" sx={ChartDescriptionStyle}>
            {description}
          </Typography>
        )}

        <Box sx={{ width: "100%", height: cardHeight }}>
          {children({ isExpanded: false })}
        </Box>
      </Box>

      <Dialog
        open={isExpanded}
        onClose={() => setIsExpanded(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: ExpandDialogPaperStyle }}
      >
        <Box sx={ExpandDialogContentStyle}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="text2"
              sx={{ fontWeight: 600, color: COLORS.blackRock }}
            >
              {title}
            </Typography>

            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {renderTimeRangeChips()}
              <IconButton
                onClick={() => setIsExpanded(false)}
                aria-label="Close expanded chart"
                sx={ChartActionButtonStyle}
              >
                <CrossIcon />
              </IconButton>
            </Box>
          </Box>

          {description && (
            <Typography variant="text4" sx={ChartDescriptionStyle}>
              {description}
            </Typography>
          )}

          <Box sx={{ width: "100%", height: dialogHeight }}>
            {children({ isExpanded: true })}
          </Box>
        </Box>
      </Dialog>
    </>
  )
}
