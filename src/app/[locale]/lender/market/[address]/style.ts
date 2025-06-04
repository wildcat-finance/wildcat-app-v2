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

export const SectionContainer = (theme: Theme): SxProps<Theme> => ({
  width: "100%",
  overflow: "hidden",
  overflowY: "visible",
  height: `calc(100vh - ${pageCalcHeights.market})`,
  padding: "0 32.3% 24px 44px",
  [theme.breakpoints.down("sm")]: {
    padding: "12px 0px 0px",
    height: "auto",
  },
})
