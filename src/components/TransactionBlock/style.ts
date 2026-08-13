import { COLORS } from "@/theme/colors"

export const AmountContainer = {
  display: "flex",
  alignItems: "flex-start",
  gap: "4px",
}

export const BlockContainer = {
  width: "100%",
  minWidth: 0,
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  borderRadius: "20px",

  backgroundColor: COLORS.white,
  border: `1px solid ${COLORS.whiteLilac}`,
}

export const TopRowContainer = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  minWidth: 0,
}

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "2px",
}

export const RowsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const RowContainer = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
}
