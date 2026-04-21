import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const CHART_COLORS = {
  deposit: "#34d399",
  withdrawalRequested: "#fca5a5",
  withdrawalExecuted: "#dc2626",
  baseInterest: "#3E68FF",
  delinquencyFees: "#C24647",
  protocolFees: "#8B8DA1",
  debtSeries: [
    "#3E68FF",
    "#34d399",
    "#D7A820",
    "#C24647",
    "#6688FF",
    "#BEBECE",
    "#F1464B",
    "#4971FF",
  ],
  gridLine: COLORS.athensGrey,
  axisText: COLORS.santasGrey,
  tooltipBg: COLORS.blackRock,
  tooltipBorder: COLORS.iron,
}

export const ChartCardStyle: SxProps<Theme> = {
  backgroundColor: COLORS.blackHaze,
  borderRadius: "12px",
  padding: "16px 20px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  "& .recharts-surface:focus, & .recharts-surface:focus-visible": {
    outline: `2px solid ${COLORS.ultramarineBlue}`,
    outlineOffset: "2px",
    borderRadius: "4px",
  },
  "& .recharts-wrapper:focus, & .recharts-wrapper:focus-visible": {
    outline: `2px solid ${COLORS.ultramarineBlue}`,
    outlineOffset: "2px",
    borderRadius: "4px",
  },
  "& .recharts-wrapper *:focus, & .recharts-wrapper *:focus-visible": {
    outline: `2px solid ${COLORS.ultramarineBlue}`,
  },
}

export const ChartHeaderStyle: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
}

export const ChartDescriptionStyle: SxProps<Theme> = {
  color: COLORS.santasGrey,
  fontSize: "11px",
  display: "block",
  marginTop: "-2px",
  lineHeight: 1.45,
}

export const TimeRangeChipStyle = (isActive: boolean): SxProps<Theme> => ({
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

export const ChartActionButtonStyle: SxProps<Theme> = {
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

export const ExpandDialogPaperStyle: SxProps<Theme> = {
  borderRadius: "12px",
  backgroundColor: COLORS.white,
  padding: 0,
  margin: "24px",
  maxWidth: "1100px",
}

export const ExpandDialogContentStyle: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 20px",
}

export const AxisStyle = {
  fontFamily: "monospace",
  fontSize: 10,
  fill: COLORS.santasGrey,
}

export const GridStyle = {
  strokeDasharray: "3 3",
  stroke: COLORS.athensGrey,
}
