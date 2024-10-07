import { COLORS } from "@/theme/colors"

export const ButtonStyle = {
  minHeight: "36px",
  minWidth: "36px",
  alignItems: "center",
  columnGap: "8px",
  color: "#FFFFFF",
  backgroundColor: "#FFFFFF1A",
  border: "none",
  "&:hover": {
    background: "#FFFFFF26",
    color: COLORS.white,
    boxShadow: "none",
  },
  position: "absolute",
  right: "180px",
  padding: "0px",
  borderRadius: "100%",
}

export const DotStyle = {
  position: "absolute",
  top: "8px",
  left: "20px",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#F1464B",
}