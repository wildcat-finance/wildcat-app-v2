import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  minHeight: { md: "270px" },
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: { xs: "4px", md: 0 },
  overflow: "hidden",
  padding: { xs: "3px", md: 0 },
  border: {
    xs: `1px solid ${COLORS.iron}`,
    md: `1px solid ${COLORS.whiteLilac}`,
  },
  borderRadius: "12px",
  backgroundColor: COLORS.white,
}

export const CardHeaderStyle = {
  width: "100%",
  minHeight: { xs: "30px", md: "32px" },
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: { xs: "6px 8px 7px", md: "7px 14px" },
  borderBottom: {
    xs: `1px solid ${COLORS.iron}`,
    md: `1px solid ${COLORS.whiteLilac}`,
  },
  backgroundColor: { xs: "transparent", md: COLORS.hintOfRed },
}

export const CardIconStyle = {
  width: "16px",
  height: "16px",
  flexShrink: 0,
}

export const CardContentStyle = {
  width: "100%",
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  gap: { xs: "4px", md: 0 },
  padding: { xs: 0, md: "12px 14px" },
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "auto",
  minHeight: "36px",
  marginTop: "auto",
  marginLeft: 0,
  marginRight: 0,
  gap: "6px",
  padding: { xs: "8px 12px", md: "7px 12px" },
  borderRadius: { xs: "10px", md: "8px" },
  backgroundColor: COLORS.bunker,
  color: COLORS.white,
  textDecoration: "none",
  cursor: "pointer",
}

export const SupplyProgressTrackStyle = {
  width: "100%",
  height: { xs: "3px", md: "4px" },
  borderRadius: { xs: "1.5px", md: "2px" },
  backgroundColor: COLORS.athensGrey,
  overflow: "hidden",
}

export const SupplyProgressFillStyle = {
  height: "100%",
  borderRadius: "inherit",
  backgroundColor: COLORS.blueRibbon,
}
