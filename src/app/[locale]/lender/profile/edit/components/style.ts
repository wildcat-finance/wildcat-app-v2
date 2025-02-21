import { COLORS } from "@/theme/colors"

export const ComponentContainer = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
}

export const FieldContainer = {
  height: "fit-content",
  width: "100%",
  display: "flex",
  gap: "20px",
  alignItems: "center",
}

export const PrevValueContainer = {
  display: "flex",
  flexDirection: "column",
  maxWidth: "35%",
}

export const BackButtonContainer = {
  color: COLORS.ultramarineBlue,
  width: "fit-content",
  borderRadius: 0,
  minWidth: "56px",
  padding: 0,
  gap: "4px",

  "&:hover": {
    boxShadow: "none",
    backgroundColor: "transparent",
    color: COLORS.ultramarineBlue,
  },
}
