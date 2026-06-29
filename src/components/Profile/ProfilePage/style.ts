import { pageCalcHeights } from "@/utils/constants"

import { BORROWER_PROFILE_VERIFICATION_GUTTER } from "../components/VerificationDisclosure/style"

export const MobileContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
}

export const PageContentContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  padding: `44px ${BORROWER_PROFILE_VERIFICATION_GUTTER} 0px 44px`,
  overflow: "scroll",
}
