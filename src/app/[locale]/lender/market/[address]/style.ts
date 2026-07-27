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

// Row that holds the scrollable main content and the right-hand side panel.
// The right 32.3% that used to be empty padding is now the MarketSidePanel; the
// left 44px inset and the vertical scroll move onto SectionMainColumn so the
// main content keeps its exact width and scroll behaviour.
export const SectionContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  flex: 1,
  minHeight: 0,
  display: "flex",
  overflow: "hidden",
  boxSizing: "border-box",
  [theme.breakpoints.down("md")]: {
    flex: "none",
    flexDirection: "column",
  },
})

export const SectionMainColumn = (theme: Theme): SxProps<Theme> => ({
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: "0 0 24px 44px",
  [theme.breakpoints.down("md")]: {
    padding: "12px 0px 0px",
    overflow: "visible",
  },
})
