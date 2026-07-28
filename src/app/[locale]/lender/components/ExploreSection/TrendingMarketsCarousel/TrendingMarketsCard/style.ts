import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  minHeight: { xs: "400px", md: "270px" },
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
  minHeight: { xs: "48px", md: "32px" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: { xs: "12px 20px", md: "7px 10px" },
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
  padding: { xs: "20px", md: "12px 10px" },
}

export const StatStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: { xs: "8px", md: "4px" },
  minWidth: 0,
  paddingBottom: { xs: "16px", md: "11px" },
  borderBottom: `1px solid ${COLORS.whiteLilac}`,
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: { xs: "56px", md: "36px" },
  marginTop: { xs: "18px", md: "14px" },
  padding: { xs: "12px 32px", md: "7px 12px" },
  borderRadius: { xs: "28px", md: "8px" },
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
