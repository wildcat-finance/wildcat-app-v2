import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  minHeight: { md: "270px" },
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: { md: "4px" },
  padding: { md: "3px" },
  overflow: "hidden",
  border: "1px solid",
  borderColor: { xs: COLORS.whiteLilac, md: COLORS.iron },
  borderRadius: { xs: "24px", md: "12px" },
  backgroundColor: COLORS.white,
}

export const CardHeaderStyle = {
  width: "100%",
  minHeight: { xs: "38px", md: "30px" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: { md: "8px" },
  padding: { xs: "9px 20px", md: "6px 8px 7px" },
  borderBottom: "1px solid",
  borderBottomColor: { xs: COLORS.whiteLilac, md: COLORS.iron },
  backgroundColor: { xs: COLORS.hintOfRed, md: COLORS.white },
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
  gap: { md: "4px" },
  padding: { xs: "12px 20px", md: 0 },
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "auto",
  minHeight: { xs: "48px", md: "36px" },
  marginTop: "auto",
  marginLeft: { xs: "-12px", md: 0 },
  marginRight: { xs: "-12px", md: 0 },
  gap: "6px",
  padding: { xs: "12px", md: "8px 12px" },
  borderRadius: { xs: "16px", md: "10px" },
  backgroundColor: COLORS.bunker,
  color: COLORS.white,
  textDecoration: "none",
  cursor: "pointer",
}

export const SupplyProgressTrackStyle = {
  width: { xs: "100%", md: "calc(100% - 4px)" },
  height: { xs: "7px", md: "3px" },
  margin: { md: "0 2px" },
  borderRadius: { xs: "4px", md: "1.5px" },
  backgroundColor: { xs: COLORS.athensGrey, md: COLORS.whiteLilac },
  overflow: "hidden",
}

export const SupplyProgressFillStyle = {
  height: "100%",
  borderRadius: "inherit",
  backgroundColor: COLORS.blueRibbon,
  opacity: { md: 0.8 },
}
