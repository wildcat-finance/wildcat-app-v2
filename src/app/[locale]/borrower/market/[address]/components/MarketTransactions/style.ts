import { COLORS } from "@/theme/colors"

export const MarketTxContainer = {
  width: "100%",
  maxWidth: "807px",
  display: "flex",
  justifyContent: "space-between",
}

export const MarketTxSkeleton = {
  bgcolor: COLORS.athensGrey,
  borderRadius: "12px",
}

export const MarketTxBlockContainer = {
  width: "395px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  borderRadius: "12px",

  backgroundColor: COLORS.hintOfRed,
}

export const MarketTxBlockTitleContainer = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "2px",
}

export const MarketTxBlockAmountContainer = {
  display: "flex",
  alignItems: "flex-start",
  gap: "4px",
}
