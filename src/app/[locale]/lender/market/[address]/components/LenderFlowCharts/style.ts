import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const CHART_COLORS = {
  deposit: "#34d399",
  withdrawalRequested: "#fca5a5",
  withdrawalExecuted: "#dc2626",
  netFlowExecuted: "#3E68FF",
  netFlowRequested: "#3E68FF",
  pendingBand: "#93A3C4",
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
  alignItems: "center",
  gap: "12px",
}

export const ChartDescription: SxProps<Theme> = {
  color: COLORS.santasGrey,
  fontSize: "11px",
  display: "block",
  marginTop: "-4px",
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

export const ChartActionButton: SxProps<Theme> = {
  padding: "4px",
  borderRadius: "4px",
  color: COLORS.santasGrey,
  "& svg": {
    width: "12px",
    height: "12px",
    display: "block",
  },
  "& svg path": {
    fill: "currentColor",
  },
  "&:hover": {
    backgroundColor: COLORS.athensGrey,
    color: COLORS.blackRock,
  },
}

export const ExpandDialogPaper: SxProps<Theme> = {
  borderRadius: "12px",
  backgroundColor: COLORS.white,
  padding: 0,
  margin: "24px",
  maxWidth: "1100px",
}

export const ExpandDialogContent: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 20px",
}
