import { COLORS, TOKENS } from "@/theme/colors"

/* The header sits on the always-dark hero strip, so we use hero tokens
 * (which stay light-on-dark in both modes) rather than theme-aware
 * foreground tokens. */
export const ConnectButton = {
  minHeight: "36px",
  width: "156px",
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
