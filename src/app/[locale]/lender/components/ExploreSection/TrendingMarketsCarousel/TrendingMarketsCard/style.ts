import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "8px 10px 10px",
  borderRadius: "12px",
  border: `1px solid ${COLORS.iron}`,
  backgroundColor: COLORS.white,
  overflow: "hidden",
}

// Top row: variant badge (left) + variant category icon (right)
export const CardHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const CardBadgeStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1px 6px",
  borderRadius: "12px",
  flexShrink: 0,
}

export const CardIconStyle = { width: "24px", height: "24px", flexShrink: 0 }

// Body: title / value / period
export const CardBodyStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 0 8px",
}

export const CardValueStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  minWidth: 0,
}

// Footer: divider on top, then borrower/asset row + CTA button
export const CardFooterStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingTop: "8px",
  borderTop: `1px solid ${COLORS.whiteLilac}`,
}

export const BorrowerAssetRowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "6px 8px 6px 0",
}

export const BorrowerLinkStyle = {
  display: "flex",
  width: "fit-content",
  minWidth: 0,
  overflow: "hidden",
  textDecoration: "none",
}

export const MarketContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "8px 12px",
  borderRadius: "10px",
  backgroundColor: COLORS.bunker,
  textDecoration: "none",
}
