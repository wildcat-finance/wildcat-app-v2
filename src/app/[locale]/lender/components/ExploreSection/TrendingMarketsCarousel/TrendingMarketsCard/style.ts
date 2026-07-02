import { COLORS } from "@/theme/colors"

export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  borderRadius: "12px",
  border: `1px solid ${COLORS.iron}`,
  backgroundColor: COLORS.white,
  overflow: "hidden",
}

// Full-width tinted band: variant badge (left) + variant category icon (right)
export const CardHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px",
}

export const CardIconStyle = { width: "24px", height: "24px", flexShrink: 0 }

// Everything under the tinted band
export const CardContentStyle = {
  width: "100%",
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "4px 10px 10px",
}

// Body: title / value / period
export const CardBodyStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "8px 0",
}

export const CardValueStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  minWidth: 0,
}

// Footer: market info block + CTA button
export const CardFooterStyle = {
  width: "100%",
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingTop: "8px",
}

// Grey block: borrower chip, asset + APR, supply progress, supplied caption
export const MarketInfoBoxStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "8px",
  borderRadius: "10px",
  backgroundColor: COLORS.hintOfRed,
}

export const BorrowerLinkStyle = {
  display: "flex",
  width: "fit-content",
  minWidth: 0,
  overflow: "hidden",
  textDecoration: "none",
}

// Bar colors sampled from target.png (converted to sRGB)
export const SupplyProgressTrackStyle = {
  width: "100%",
  height: "4px",
  borderRadius: "2px",
  backgroundColor: COLORS.iron,
  overflow: "hidden",
}

export const SupplyProgressFillStyle = {
  height: "100%",
  borderRadius: "inherit",
  backgroundColor: "#555988",
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
