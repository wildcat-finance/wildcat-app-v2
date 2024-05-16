import { COLORS } from "@/theme/colors"

export const TitleContainer = {
  marginBottom: "28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  rowGap: "8px",
}

export const Description = { color: COLORS.santasGrey }

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

export const DropdownOption = { width: "360px" }

export const BackButton = { justifyContent: "flex-start" }

export const BackButtonArrow = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.bunker}` },
}

export const ConfirmButton = { width: "140px" }
