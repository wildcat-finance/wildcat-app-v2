import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

export const smallContainedButton = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 600,
  color: COLORS.white,

  padding: "6px 12px",
  borderRadius: 8,
  backgroundColor: COLORS.bunker,

  "&:hover": {
    background: COLORS.blackRock,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}
export const mediumContainedButton = {
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  fontWeight: 600,
  color: COLORS.white,

  padding: "12px",
  borderRadius: 10,
  backgroundColor: COLORS.bunker,

  "&:hover": {
    background: COLORS.blackRock,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}
export const largeContainedButton = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 600,
  color: COLORS.white,

  padding: "12px 20px",
  borderRadius: 12,
  backgroundColor: COLORS.bunker,

  "&:hover": {
    background: COLORS.blackRock,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}

export const smallContainedSecondaryButton = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "6px 12px",
  borderRadius: 8,
  backgroundColor: COLORS.whiteSmoke,

  "&:hover": {
    background: COLORS.athensGrey,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}
export const mediumSecondaryContainedButton = {
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px",
  borderRadius: 10,
  backgroundColor: COLORS.whiteSmoke,

  "&:hover": {
    background: COLORS.athensGrey,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}
export const largeSecondaryContainedButton = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px 20px",
  borderRadius: 12,
  backgroundColor: COLORS.whiteSmoke,

  "&:hover": {
    background: COLORS.athensGrey,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    backgroundColor: COLORS.athensGrey,
  },
}

export const smallTextButton = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "6px 12px",
  borderRadius: 8,
  background: "transparent",

  "&:hover": {
    boxShadow: "none",
    backgroundColor: COLORS.hintOfRed,
    color: COLORS.blackRock08,
  },

  "&.Mui-disabled": {
    opacity: 0.6,
  },
}
export const mediumTextButton = {
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px",
  borderRadius: 10,
  background: "transparent",

  "&:hover": {
    boxShadow: "none",
    backgroundColor: COLORS.hintOfRed,
    color: COLORS.blackRock08,
  },

  "&.Mui-disabled": {
    opacity: 0.6,
  },
}
export const largeTextButton = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px 20px",
  borderRadius: 12,
  background: "transparent",

  "&:hover": {
    boxShadow: "none",
    backgroundColor: COLORS.hintOfRed,
    color: COLORS.blackRock08,
  },

  "&.Mui-disabled": {
    opacity: 0.6,
  },
}

export const smallOutlinedButton = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "6px 12px",
  borderRadius: 8,
  borderColor: COLORS.blackRock,

  "&:hover": {
    borderColor: COLORS.blackRock,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.iron,
    background: "transparent",
  },
}
export const mediumOutlinedButton = {
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px",
  borderRadius: 10,
  borderColor: COLORS.blackRock,

  "&:hover": {
    borderColor: COLORS.blackRock,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.iron,
    background: "transparent",
  },
}
export const largeOutlinedButton = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px 20px",
  borderRadius: 12,
  borderColor: COLORS.blackRock,

  "&:hover": {
    borderColor: COLORS.blackRock,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.iron,
    background: "transparent",
  },
}

export const smallOutlinedSecondaryButton = {
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "6px 12px",
  borderRadius: 8,
  borderColor: COLORS.whiteLilac,

  "&:hover": {
    borderColor: COLORS.whiteLilac,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.whiteLilac,
    background: "transparent",
  },
}
export const mediumOutlinedSecondaryButton = {
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px",
  borderRadius: 10,
  borderColor: COLORS.whiteLilac,

  "&:hover": {
    borderColor: COLORS.whiteLilac,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.whiteLilac,
    background: "transparent",
  },
}
export const largeOutlinedSecondaryButton = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 600,
  color: COLORS.bunker,

  padding: "12px 20px",
  borderRadius: 12,
  borderColor: COLORS.whiteLilac,

  "&:hover": {
    borderColor: COLORS.whiteLilac,
    background: COLORS.blackRock03,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: COLORS.santasGrey,
    borderColor: COLORS.whiteLilac,
    background: "transparent",
  },
}
