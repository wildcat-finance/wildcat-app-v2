import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const CHART_COLORS = {
  deposit: "#34d399",
  withdrawal: "#f87171",
  netFlow: "#3E68FF",
  gridLine: COLORS.athensGrey,
  axisText: COLORS.santasGrey,
  tooltipBg: COLORS.blackRock,
  tooltipBorder: COLORS.iron,
}

export const ChartsGrid = (isMobile: boolean): SxProps<Theme> => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
  gap: "12px",
  width: "100%",
})

export const ChartCardStyle: SxProps<Theme> = {
  backgroundColor: COLORS.blackHaze,
  borderRadius: "12px",
  padding: "16px 20px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const ChartHeader: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}

export const TimeRangeButton = (isActive: boolean): SxProps<Theme> => ({
  fontFamily: "monospace",
  fontSize: "10px",
  color: isActive ? COLORS.ultramarineBlue : COLORS.santasGrey,
  backgroundColor: isActive ? COLORS.blueRibbon01 : "transparent",
  padding: "3px 7px",
  borderRadius: "4px",
  cursor: "pointer",
  border: "none",
  minWidth: "auto",
  lineHeight: 1.4,
  "&:hover": {
    backgroundColor: isActive ? COLORS.blueRibbon01 : COLORS.athensGrey,
  },
})
