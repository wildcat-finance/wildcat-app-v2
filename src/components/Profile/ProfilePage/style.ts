import type { SxProps, Theme } from "@mui/material"

import { pageCalcHeights } from "@/utils/constants"

import { MobileInfoSectionContainer } from "../components/OverallBlock/style"
import { BORROWER_PROFILE_VERIFICATION_COLUMN } from "../components/VerificationDisclosure/style"

export const MobileContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
}

export const PageContentContainer: SxProps<Theme> = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  padding: "44px",
  overflow: "scroll",
}

export const DesktopProfileGrid: SxProps<Theme> = (theme) => ({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${BORROWER_PROFILE_VERIFICATION_COLUMN.width}`,
  gridTemplateRows: "auto auto 1fr auto",
  gridTemplateAreas: `"header card" "overall card" "tou card" "markets markets"`,
  columnGap: BORROWER_PROFILE_VERIFICATION_COLUMN.gap,
  [theme.breakpoints.down("lg")]: {
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "none",
    gridTemplateAreas: `"header" "overall" "card" "tou" "markets"`,
  },
})

export const MobileVerificationCard: SxProps<Theme> = (theme) => ({
  "& > aside": {
    marginTop: MobileInfoSectionContainer.marginTop,
    padding: MobileInfoSectionContainer.padding,
    border: "none",
  },
  "& #borrower-profile-verification-title": {
    ...theme.typography.mobH3,
    marginTop: "12px",
  },
})
