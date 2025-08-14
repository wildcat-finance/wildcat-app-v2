import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const contentContainer = (theme: Theme): SxProps<Theme> => ({
  height: "82px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 16px 16px 8px",

  [theme.breakpoints.down("md")]: {
    position: "fixed",
    top: "0px",
    width: "calc(100vw - 8px)",

    margin: "4px",
    background: COLORS.white,
    borderRadius: "14px",
    height: "56px",
    padding: "0 12px 0 0",
    zIndex: 5,
  },
})

export const NavContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "12px",

  color: "#FFFFFF",
}
