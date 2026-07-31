import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  minHeight: { md: "270px" },
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${COLORS.whiteLilac}`,
  borderRadius: { xs: "24px", md: "12px" },
  backgroundColor: COLORS.white,
}

export const CardHeaderStyle = {
  width: "100%",
  minHeight: { xs: "38px", md: "32px" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: { xs: "9px 16px", md: "7px 14px" },
  borderBottom: `1px solid ${COLORS.whiteLilac}`,
  backgroundColor: COLORS.hintOfRed,
}

export const CardIconStyle = {
  width: { xs: "18px", md: "16px" },
  height: { xs: "18px", md: "16px" },
  flexShrink: 0,
}

export const CardContentStyle = {
  width: "100%",
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  padding: { xs: "12px 16px", md: "12px 14px" },
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "auto",
  minHeight: { xs: "48px", md: "36px" },
  marginTop: "auto",
  marginLeft: { xs: "-8px", md: 0 },
  marginRight: { xs: "-8px", md: 0 },
  gap: "6px",
  padding: { xs: "12px", md: "7px 12px" },
  borderRadius: { xs: "12px", md: "8px" },
  backgroundColor: COLORS.bunker,
  color: COLORS.white,
  textDecoration: "none",
  cursor: "pointer",
}

export const SupplyProgressTrackStyle = {
  width: "100%",
  height: { xs: "7px", md: "4px" },
  borderRadius: { xs: "4px", md: "2px" },
  backgroundColor: COLORS.athensGrey,
  overflow: "hidden",
}

export const SupplyProgressFillStyle = {
  height: "100%",
  borderRadius: "inherit",
  backgroundColor: COLORS.blueRibbon,
}
