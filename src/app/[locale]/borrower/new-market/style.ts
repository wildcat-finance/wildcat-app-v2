import { COLORS } from "@/theme/colors"

export const newMarketContainer = { padding: "52px 366px 0 101px" }

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

export const backButton = { width: "140px", justifyContent: "flex-start" }

export const backButtonArrow = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.bunker}` },
}

export const nextButton = { width: "140px" }
