import { COLORS, TOKENS } from "@/theme/colors"

export const ButtonStyle = {
  minHeight: "36px",
  minWidth: "36px",
  alignItems: "center",
  columnGap: "8px",
  color: COLORS.staticWhite,
  backgroundColor: TOKENS.heroButtonBg,
  border: `1px solid ${TOKENS.heroButtonBorder}`,
  "&:hover": {
    background: TOKENS.heroButtonBgHover,
    color: COLORS.staticWhite,
    boxShadow: "none",
    borderColor: TOKENS.heroButtonBorder,
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
  backgroundColor: COLORS.carminePink,
}
