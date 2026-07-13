import { COLORS } from "@/theme/colors"

// Transparent wrapper — the tinted band and the white card are separately
// rounded and overlap (the white card sits on top of the band).
export const CardContainerStyle = {
  width: "100%",
  minWidth: "222px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
}

// Tinted band that peeks above the white card, which overlaps it by 32px.
export const CardHeaderStyle = {
  width: "100%",
  height: "61px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "8px 10px",
  borderRadius: "12px",
  marginBottom: "-32px",
}

export const CardIconStyle = { width: "16px", height: "16px", flexShrink: 0 }

// White card overlapping the band; holds all the content.
export const CardContentStyle = {
  position: "relative" as const,
  width: "100%",
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "4px",
  borderRadius: "12px",
  border: `1px solid ${COLORS.whiteLilac}`,
  backgroundColor: COLORS.white,
}

// Body: title / value / period
export const CardBodyStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "8px 6px 4px",
}

export const CardValueStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  minWidth: 0,
}

// Footer: grey market-info box + CTA, pinned to the bottom of the card.
export const CardFooterStyle = {
  width: "100%",
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}

// Supply progress + caption (sits below the borrower/asset block).
export const SupplyBlockStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "12px 4px 0",
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
  // cursor inherits from the drag-scroll container, so restate the link cursor
  cursor: "pointer",
}
