import { COLORS } from "@/theme/colors"

export const FormContainer = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
}

export const SectionGrid = {
  width: "100%",
  display: "grid",
  gridTemplateRows: "repeat(2, 1fr)",
  gridTemplateColumns: "repeat(2, 1fr)",
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
