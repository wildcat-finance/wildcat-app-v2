import { pageCalcHeights } from "@/utils/constants"

export const MobileContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
}

export const PageContentContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  padding: "44px 27.48% 44px 44px",
  overflow: "scroll",
}
