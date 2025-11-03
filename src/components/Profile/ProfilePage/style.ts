import { pageCalcHeights } from "@/utils/constants"

export const PageContentContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  padding: "44px 27.48% 0px 44px",
  overflow: "scroll",
}
