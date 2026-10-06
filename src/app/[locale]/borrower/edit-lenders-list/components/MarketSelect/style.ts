import { COLORS, TOKENS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

export const MarketSelectStyles = {
  width: "fit-content !important",
  height: "32px !important",
  minHeight: "32px !important",
  paddingRight: "0px !important",
  border: "none !important",

  "& .MuiSelect-select": {
    padding: "0 !important",
    paddingRight: "35px !important",

    "& .MuiTypography-root": {
      fontSize: pxToRem(24),
      lineHeight: lh(32, 24),
      fontWeight: 500,
    },
  },
}

/* The MarketSelect/PolicySelect menus open from a heading that always sits
 * on the dark hero strip — so the dropdown itself is intentionally a dark
 * surface in both light and dark mode. We use a static dark color for
 * the menu background and pure-white text for consistent presentation. */
export const MarketSelectMenuStyles = {
  "& .MuiPaper-root": {
    width: "360px",
    fontFamily: "inherit",
    padding: "8px",
    backgroundColor: "#1a1a1a",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
    backgroundImage: "none",
    color: COLORS.staticWhite,
  },
  "& .MuiMenuItem-root .MuiTypography-root": {
    color: COLORS.staticWhite,
  },
}

export const SearchStyles = {
  marginBottom: "8px",

  "& .MuiInputBase-root": {
    color: COLORS.staticWhite,
    border: "none",
    borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
    borderRadius: 0,
  },

  "& .MuiInputBase-input": {
    color: COLORS.staticWhite,
    "&::placeholder": {
      color: "rgba(255, 255, 255, 0.45)",
      opacity: 1,
    },
  },

  "& .MuiFormLabel-root": {
    color: "rgba(255, 255, 255, 0.45)",
  },
}

export const MarketSelectMenuItemStyles = {
  "&:hover": {
    background: "rgba(255, 255, 255, 0.08)",
  },
  "&.Mui-focusVisible": {
    background: "rgba(255, 255, 255, 0.08)",
  },
  "&.Mui-selected": {
    background: "transparent",
    color: "rgba(255, 255, 255, 0.55)",
    "&:hover": {
      background: "transparent",
      cursor: "pointer",
    },
    "&.Mui-focusVisible": {
      background: "transparent",
    },
  },
}
