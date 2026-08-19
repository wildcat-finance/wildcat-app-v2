import { Theme, SxProps } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

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

export const LenderBannerWrapper: SxProps<Theme> = {
  padding: "52px 32.3% 0 44px",
  flex: "0 0 auto",
}

// Scroll the banner and market section together inside the fixed page shell.
export const MarketContentColumn = (
  theme: Theme,
  isWrongNetwork?: boolean,
): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  height: `calc(100vh - ${pageCalcHeights.market} ${
    isWrongNetwork ? "- 130px" : ""
  })`,
  overflowX: "hidden",
  overflowY: "auto",
  [theme.breakpoints.down("md")]: {
    height: "auto",
    overflow: "visible",
  },
})

export const SectionContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  padding: "0 32.3% 24px 44px",
  [theme.breakpoints.down("md")]: {
    padding: "12px 0px 0px",
  },
})
