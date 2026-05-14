import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px",
  borderRadius: "12px",
  border: `1px solid ${COLORS.iron}`,
  backgroundColor: COLORS.white,
  overflow: "hidden",
}

export const CardInfoContainerStyle = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "8px",
}

export const CardValueContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  alignItems: "flex-start",
  minWidth: 0,
}

export const CardIconStyle = { width: "28px", height: "28px", flexShrink: 0 }

export const CardValueStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  paddingBottom: "8px",
  minWidth: 0,
}

export const CardBadgeStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  borderRadius: "12px",
  flexShrink: 0,
}

export const LinksContainerStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}

export const BorrowersContainerStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "10px",
  backgroundColor: COLORS.whiteSmoke,
  textDecoration: "none",
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  backgroundColor: COLORS.bunker,
  textDecoration: "none",
}
