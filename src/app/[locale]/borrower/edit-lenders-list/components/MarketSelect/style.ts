import { COLORS } from "@/theme/colors"
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

export const MarketSelectMenuStyles = {
  "& .MuiPaper-root": {
    width: "360px",
    fontFamily: "inherit",
    padding: "8px",
    backgroundColor: COLORS.cobaltBlack,
  },
}

export const SearchStyles = {
  marginBottom: "8px",

  "& .MuiInputBase-root": {
    color: COLORS.white,
    border: "none",
    borderBottom: `1px solid ${COLORS.white01}`,
    borderRadius: 0,
  },

  "& .MuiFormLabel-root": {
    color: COLORS.white03,
  },
}

export const MarketSelectMenuItemStyles = {
  "&:hover": {
    background: COLORS.white01,
  },
  "&.Mui-focusVisible": {
    background: COLORS.white01,
  },
  "&.Mui-selected": {
    background: "transparent",
    color: COLORS.santasGrey,
    "&:hover": {
      background: "transparent",
      cursor: "pointer",
    },
    "&.Mui-focusVisible": {
      background: "transparent",
    },
  },
}
