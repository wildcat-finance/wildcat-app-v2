import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const StandaloneActionsContainer: SxProps<Theme> = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: "6px",
  rowGap: "6px",
}

export const ActionButtonSx: SxProps<Theme> = {
  height: "28px",
}

export const TelegramButtonSx: SxProps<Theme> = {
  height: "28px",
  padding: "6px 12px 6px 6px !important",
  gap: "2px",
  border: `1px solid ${COLORS.hawkesBlue}`,
  color: COLORS.ultramarineBlue,
  textDecoration: "none",
  "&:hover": {
    bgcolor: "rgba(62,104,255,0.06)",
    border: `1px solid ${COLORS.hawkesBlue}`,
  },
}

export const TelegramIconSx: SxProps<Theme> = {
  fontSize: "20px",
  flexShrink: 0,
  "& path": { fill: COLORS.ultramarineBlue },
}
