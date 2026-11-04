import type { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

import {
  BORROWER_PROFILE_NOTE_BLEED,
  BORROWER_PROFILE_NOTE_COLUMN,
  BORROWER_PROFILE_NOTE_GAP,
  BORROWER_PROFILE_VERIFICATION_GUTTER,
} from "../components/VerificationDisclosure/style"

export const MobileContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
}

export const PageContentContainer: SxProps<Theme> = (theme) => ({
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  padding: `44px ${BORROWER_PROFILE_VERIFICATION_GUTTER} 44px 44px`,
  overflow: "scroll",
  [theme.breakpoints.down("lg")]: {
    paddingRight: "44px",
  },
})

// From lg the verification note is the overview's second column, in the
// page's right gutter, so the sections below it can reach into that gutter.
export const OverviewSection: SxProps<Theme> = (theme) => ({
  [theme.breakpoints.up("lg")]: {
    display: "grid",
    gridTemplateColumns: `minmax(0, 1fr) ${BORROWER_PROFILE_NOTE_COLUMN}`,
    columnGap: BORROWER_PROFILE_NOTE_GAP,
    alignItems: "start",
    marginRight: `calc(0px - ${BORROWER_PROFILE_NOTE_BLEED})`,
  },
})

// The analytics take the full width, as the design handoff lays them out.
export const AnalyticsSection: SxProps<Theme> = (theme) => ({
  [theme.breakpoints.up("lg")]: {
    marginRight: `calc(0px - ${BORROWER_PROFILE_NOTE_BLEED})`,
  },
})

// On phones the analytics sit on the page gradient, so they get a surface.
export const MobileAnalyticsContainer: SxProps<Theme> = {
  backgroundColor: COLORS.white,
  borderRadius: "14px",
  padding: "12px 16px",
}
