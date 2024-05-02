import { COLORS } from "@/theme/colors"

export const DividerStyle = { margin: "36px 0" }

export const InputGroupContainer = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "38px 10px",
  marginTop: "36px",
}

export const ButtonsContainer = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "42px",
}

export const BackButton = { justifyContent: "flex-start" }

export const BackButtonArrow = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.bunker}` },
}

export const NextButton = { width: "140px" }
