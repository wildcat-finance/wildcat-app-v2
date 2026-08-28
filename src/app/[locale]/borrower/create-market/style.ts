import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"

export const PageContainer = {
  width: "100%",
  height: `calc(100vh - ${pageCalcHeights.page})`,
  display: "flex",
  justifyContent: "space-between",
  overflow: "hidden",
}

export const StepContainer = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  padding: "0 100px",
  overflowX: "hidden",
  overflowY: "auto",
  scrollbarGutter: "stable",
}

export const StepHeader = {
  flexShrink: 0,
  paddingBottom: "20px",
  position: "sticky",
  top: 0,
  zIndex: 1,
  pointerEvents: "none",
}

export const StepHeaderBar = {
  display: "flex",
  flexDirection: "column",
  padding: "40px 0 20px",
  backgroundColor: COLORS.white,
  borderBottom: `1px solid ${COLORS.blackRock006}`,
  pointerEvents: "auto",
}

export const GlossaryColumn = {
  height: "100%",
  flexShrink: 0,
  overflowY: "auto",
}
