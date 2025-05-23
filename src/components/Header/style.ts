import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const contentContainer = (theme: Theme): SxProps<Theme> => ({
  height: "66px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "16px 16px 16px 8px",
  background: "transparent",
  [theme.breakpoints.down("sm")]: {
    margin: "4px",
    background: COLORS.white,
    borderRadius: "14px",
    height: "56px",
    paddingRight: "12px",
    position: "relative",
    zIndex: 9999,
  },
})

export const NavContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "12px",

  color: "#FFFFFF",
}
