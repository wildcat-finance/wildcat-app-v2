import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const SkeletonContainer = {
  width: "100%",
  maxWidth: "807px",
  display: "flex",
  justifyContent: "space-between",
}

export const SkeletonStyle = {
  bgcolor: COLORS.athensGrey,
  borderRadius: "12px",
}

export const PageColumn: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
}

export const LenderBannerWrapper: SxProps<Theme> = {
  padding: "52px 32.3% 0 44px",
  flex: "0 0 auto",
}

export const SectionContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  overflow: "hidden",
  overflowY: "visible",
  flex: "1 1 auto",
  minHeight: 0,
  padding: "0 32.3% 24px 44px",
  [theme.breakpoints.down("md")]: {
    padding: "12px 0px 0px",
    flex: "0 0 auto",
    height: "auto",
  },
})
