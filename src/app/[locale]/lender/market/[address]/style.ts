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

// Owns the viewport-height budget below the market header so the banner and the
// section share it: the banner takes its natural (variable) height and the
// section flex-grows into whatever remains.
export const MarketContentColumn = (
  theme: Theme,
  isWrongNetwork?: boolean,
): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  height: `calc(100vh - ${pageCalcHeights.market} ${
    isWrongNetwork ? "- 130px" : ""
  })`,
  [theme.breakpoints.down("md")]: {
    height: "auto",
  },
})

export const SectionContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  overflowY: "visible",
  padding: "0 32.3% 24px 44px",
  [theme.breakpoints.down("md")]: {
    flex: "none",
    padding: "12px 0px 0px",
  },
})
