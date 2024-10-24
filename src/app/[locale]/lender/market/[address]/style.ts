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

export const SectionContainer = {
  width: "100%",
  overflow: "hidden",
  overflowY: "visible",
  height: "calc(100vh - 43px - 43px - 52px - 60px - 52px)",
}
