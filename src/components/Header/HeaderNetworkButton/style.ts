import { COLORS } from "@/theme/colors"

export const ConnectButton = {
  minHeight: "36px",
  width: "fit-content",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4px",
  padding: "8px 10px",
  color: COLORS.white,
  backgroundColor: "#FFFFFF1A",
  borderRadius: "20px",
  position: "relative",
  border: "1px solid transparent",
  backgroundClip: "padding-box",

  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "20px",
    padding: "1px",
    background:
      "linear-gradient(to right, rgba(255, 255, 255, 0.4), rgba(153, 153, 153, 0))",
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude",
    pointerEvents: "none",
  },

  "&:hover": {
    background: "#FFFFFF26",
    color: COLORS.white,
    boxShadow: "none",
  },
}
