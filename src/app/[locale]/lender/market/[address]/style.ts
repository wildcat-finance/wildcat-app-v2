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

export const LenderBannerWrapper: SxProps<Theme> = {
  padding: "4px 32.3% 0 44px",
  flex: "0 0 auto",
}

// Banners bring no spacing below them, so the actions add 12px of their own
// when they follow one.
export const StandaloneActionsWrapper = (
  afterNotice: boolean,
): SxProps<Theme> => ({
  padding: "0 32.3% 0 44px",
  flex: "0 0 auto",
  ...(!afterNotice && {
    "&:not(:first-child)": {
      paddingTop: "12px",
    },
  }),
})

export const StandaloneActionsDivider: SxProps<Theme> = {
  margin: "32px 0 8px",
}

export const DefaultNoticeWrapper = (
  beforeActions: boolean,
): SxProps<Theme> => ({
  padding: {
    xs: 0,
    md: `0 32.3% ${beforeActions ? "12px" : "26px"} 44px`,
  },
  flex: "0 0 auto",
  "&:not(:first-child)": {
    paddingTop: { md: "12px" },
  },
})

export const MarketPageContainer = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 0",
  minHeight: 0,
  [theme.breakpoints.down("md")]: {
    display: "block",
    flex: "0 0 auto",
  },
})

// Scroll the banner and market section together inside the fixed page shell.
export const MarketContentColumn = (theme: Theme): SxProps<Theme> => ({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 0",
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  [theme.breakpoints.down("md")]: {
    flex: "0 0 auto",
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
