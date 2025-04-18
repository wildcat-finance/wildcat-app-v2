import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const containerBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  width: "100%",
  height: "calc(100vh - 60px)",
  padding: "8px",
  [theme.breakpoints.down("sm")]: {
    height: "calc(100vh - 96px)",
  },
})

export const mainBox = (theme: Theme): SxProps<Theme> => ({
  position: "relative",
  display: "flex",
  width: "100%",
  maxWidth: "650px",
  mx: "auto",
  flexDirection: "column",
  backgroundColor: COLORS.white,
  borderRadius: "16px",
  py: "32px",
  px: "24px",
  paddingBottom: "24px",
  gap: "24px",
  [theme.breakpoints.down("sm")]: {
    gap: "16px",
    height: "calc(100% - 0.1px)",
    overflow: "scroll",
    backgroundColor: COLORS.white,
    borderRadius: "14px",
    padding: "32px 12px 12px 12px",
  },
})

export const title = (theme: Theme): SxProps<Theme> => ({
  [theme.breakpoints.down("sm")]: {
    fontSize: "18px",
  },
})

export const button = (theme: Theme): SxProps<Theme> => ({
  width: "auto",
  mx: "auto",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
  zIndex: "1000",
})

export const contentBox = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "scroll",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  scrollbarWidth: "none",
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: COLORS.white,
    borderRadius: "10px",
  },
})

export const whiteGradientBox = (theme: Theme): SxProps<Theme> => ({
  position: "absolute",
  bottom: "0",
  right: "0",
  left: "0",
  height: "256px",
  borderBottomLeftRadius: "16px",
  borderBottomRightRadius: "16px",
  backgroundImage: "linear-gradient(3deg, #FFFFFF 40%, #FFFFFF00 73%)",
  pointerEvents: "none",
  [theme.breakpoints.down("sm")]: {
    height: "150px",
  },
})
