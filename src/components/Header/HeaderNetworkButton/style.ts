import { COLORS } from "@/theme/colors"

export const ConnectButton = {
  minHeight: "36px",
  maxWidth: "172px",
  alignItems: "center",
  // space between icon and text
  justifyContent: "space-between",
  columnGap: "8px",
  color: "#FFFFFF",
  backgroundColor: "#FFFFFF1A",
  border: "none",
  "&:hover": {
    background: "#FFFFFF26",
    color: COLORS.white,
    boxShadow: "none",
  },
}
