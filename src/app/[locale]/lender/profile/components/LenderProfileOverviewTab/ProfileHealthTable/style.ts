import { COLORS } from "@/theme/colors"

// Status filter-chip styling (local to the Portfolio health table).
export const ProfileHealthChipsRowSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "16px",
}

export const profileHealthChipSx = (selected: boolean) => ({
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
