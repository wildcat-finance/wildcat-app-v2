import { pageCalcHeights } from "@/utils/constants"

export const PageContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  display: "flex",
  justifyContent: "space-between",
  overflow: "hidden",
  overflowY: "visible",
}
