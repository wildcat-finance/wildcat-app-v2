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
export const ContentContainer = {
  padding: "40px 367px 0 100px",
  display: "flex",
  justifyContent: "space-around",
  height: "calc(100vh - 43px - 43px - 52px);",
  overflow: "hidden",
  overflowY: "visible",
}

export const DividerStyle = { margin: "36px 0 32px" }

export const InputGroupContainer = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "38px 10px",
}

export const ButtonsContainer = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "42px",
}

export const DropdownOption = { width: "360px" }

export const BackButton = { justifyContent: "flex-start" }

export const endDecorator = { color: COLORS.santasGrey }

export const BackButtonArrow = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.bunker}` },
}

export const NextButton = { width: "140px" }
