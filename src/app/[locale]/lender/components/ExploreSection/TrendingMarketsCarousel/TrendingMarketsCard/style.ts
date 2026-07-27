import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  minHeight: "270px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${COLORS.whiteLilac}`,
  borderRadius: "12px",
  backgroundColor: COLORS.white,
}

export const CardHeaderStyle = {
  width: "100%",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "7px 10px",
  borderBottom: `1px solid ${COLORS.whiteLilac}`,
  backgroundColor: COLORS.hintOfRed,
}

export const CardIconStyle = { width: "16px", height: "16px", flexShrink: 0 }

export const CardContentStyle = {
  width: "100%",
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  padding: "12px 10px",
}

export const StatStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: "4px",
  minWidth: 0,
  paddingBottom: "11px",
  borderBottom: `1px solid ${COLORS.whiteLilac}`,
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "36px",
  marginTop: "14px",
  padding: "7px 12px",
  borderRadius: "8px",
  backgroundColor: COLORS.bunker,
  color: COLORS.white,
  textDecoration: "none",
  cursor: "pointer",
}

export const SupplyProgressTrackStyle = {
  width: "100%",
  height: "4px",
  borderRadius: "2px",
  backgroundColor: COLORS.athensGrey,
  overflow: "hidden",
}

export const SupplyProgressFillStyle = {
  height: "100%",
  borderRadius: "inherit",
  backgroundColor: COLORS.blueRibbon,
}
