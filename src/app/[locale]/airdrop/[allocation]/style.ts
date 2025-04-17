import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const containerBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  width: "100%",
  height: "calc(100vh - 60px)",
  padding: "8px",
  [theme.breakpoints.down("sm")]: {},
})

export const mainBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  width: "100%",
  gap: "8px",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column-reverse",
    gap: "0px",
    height: "calc(100% - 0.1px)",
    overflow: "scroll",
    backgroundColor: COLORS.white,
    borderRadius: "14px",
    padding: "8px",
  },
})

export const leftBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  padding: "28px 16px",
  height: "100%",
  width: "100%",
  gap: "12px",
  justifyContent: "space-between",
  backgroundColor: COLORS.white,
  borderRadius: "12px",
  [theme.breakpoints.down("sm")]: {
    borderRadius: "0px",
    height: "max-content",
    padding: "0px",
  },
})

export const leftTitle = (theme: Theme): SxProps<Theme> => ({
  color: COLORS.black,
  [theme.breakpoints.down("sm")]: {
    marginTop: "40px",
    fontSize: "16px",
  },
})

export const rightBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flex: 2,
  flexDirection: "column",
  padding: "28px 20px",
  height: "100%",
  width: "100%",
  backgroundColor: COLORS.white,
  borderRadius: "12px",
  gap: "20px",
  [theme.breakpoints.down("sm")]: {
    borderRadius: "0px",
    height: "max-content",
    padding: "0px",
  },
})

export const rightTitle = (theme: Theme): SxProps<Theme> => ({
  color: COLORS.black,
  [theme.breakpoints.down("sm")]: {
    marginTop: "32px",
  },
})

export const footerText = (theme: Theme): SxProps<Theme> => ({
  [theme.breakpoints.down("sm")]: {
    display: "none",
  },
})
