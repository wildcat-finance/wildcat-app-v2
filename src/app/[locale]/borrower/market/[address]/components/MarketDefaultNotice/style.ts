import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const NoticeContainer: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "0 10px 12px",
  marginBottom: "8px",
}

export const NoticeIconRow: SxProps<Theme> = {
  height: "24px",
  display: "flex",
  alignItems: "center",
}

export const NoticeTextColumn: SxProps<Theme> = (theme) => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingRight: "100px",
  [theme.breakpoints.down("md")]: {
    paddingRight: 0,
  },
})

export const NoticeTitleRow: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "4px",
}

export const MarketLinkChip: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "12px",
  bgcolor: COLORS.whiteSmoke,
  "&:hover": { bgcolor: COLORS.athensGrey },
}
