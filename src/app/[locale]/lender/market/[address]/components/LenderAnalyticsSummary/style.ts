import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const SummaryGrid = (isMobile: boolean): SxProps<Theme> =>
  isMobile
    ? {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.white,
        borderRadius: "14px",
        padding: "12px 16px",
      }
    : {
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gridAutoRows: "1fr",
        gap: "12px",
      }

export const SummaryCard: SxProps<Theme> = {
  minWidth: 0,
  padding: "16px",
  borderRadius: "12px",
  backgroundColor: COLORS.blackHaze,
}

export const MobileSummaryRow: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
}
