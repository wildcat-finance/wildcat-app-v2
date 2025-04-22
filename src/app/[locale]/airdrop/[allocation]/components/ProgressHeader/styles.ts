import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const containerBox = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "24px",
  [theme.breakpoints.down("sm")]: {
    mx: "-8px",
    width: "calc(100% + 16px)",
    paddingTop: "16px",
  },
})
