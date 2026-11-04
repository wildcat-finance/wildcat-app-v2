import type { SxProps, Theme } from "@mui/material"

import { pageCalcHeights } from "@/utils/constants"

import {
  BORROWER_PROFILE_VERIFICATION_GUTTER,
  BORROWER_PROFILE_VERIFICATION_NOTE_SPAN,
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

export const DefaultNoticeContainer: SxProps<Theme> = {
  marginBottom: "28px",
  marginRight: {
    lg: `calc(0px - ${BORROWER_PROFILE_VERIFICATION_NOTE_SPAN})`,
  },
}

export const MobileDefaultNoticeContainer = {
  marginBottom: "4px",
}
