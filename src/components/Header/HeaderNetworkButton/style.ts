import { COLORS, TOKENS } from "@/theme/colors"

export const ConnectButton = {
  minHeight: "36px",
  alignItems: "center",
  columnGap: "8px",
  color: COLORS.staticWhite,
  backgroundColor: TOKENS.heroButtonBg,
  border: `1px solid ${TOKENS.heroButtonBorder}`,
  "&:hover": {
    background: TOKENS.heroButtonBgHover,
    color: COLORS.staticWhite,
    borderColor: TOKENS.heroButtonBorder,
    boxShadow: "none",
  },
}
