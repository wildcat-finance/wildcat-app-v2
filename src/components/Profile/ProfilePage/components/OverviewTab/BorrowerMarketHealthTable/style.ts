import { COLORS } from "@/theme/colors"

// Status filter-chip styling (mirrors the lender Portfolio-health table chips).
export const MarketHealthChipsRowSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "16px",
}

export const marketHealthChipSx = (selected: boolean) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  height: "28px",
  padding: "6px 12px",
  borderRadius: "24px",
  cursor: "pointer",
  appearance: "none",
  backgroundColor: "transparent",
  border: `1px solid ${selected ? COLORS.manate : COLORS.whiteLilac}`,
  transition: "border-color 0.2s ease",
  "&:hover": {
    borderColor: COLORS.manate,
  },
})

// "Total Debt / Remaining" utilization bar.
export const DebtBarTrackSx = {
  width: "70%",
  height: "4px",
  borderRadius: "3px",
  overflow: "hidden",
  backgroundColor: COLORS.athensGrey,
}
