import { COLORS, TOKENS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

const containedBase = {
  fontWeight: 600,
  color: TOKENS.actionPrimaryFg,
  backgroundColor: TOKENS.actionPrimaryBg,

  "&:hover": {
    background: TOKENS.actionPrimaryBgHover,
    color: TOKENS.actionPrimaryFg,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: TOKENS.actionPrimaryDisabledFg,
    backgroundColor: TOKENS.actionPrimaryDisabledBg,
  },
}

export const smallContainedButton = {
  ...containedBase,
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  padding: "6px 12px",
  borderRadius: 8,
}
export const mediumContainedButton = {
  ...containedBase,
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  padding: "12px",
  borderRadius: 10,
}
export const largeContainedButton = {
  ...containedBase,
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  padding: "12px 20px",
  borderRadius: 12,
}

const containedSecondaryBase = {
  fontWeight: 600,
  color: TOKENS.actionSecondaryFg,
  backgroundColor: TOKENS.actionSecondaryBg,

  "&:hover": {
    background: TOKENS.actionSecondaryBgHover,
    color: TOKENS.actionSecondaryFg,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: TOKENS.actionSecondaryDisabledFg,
    backgroundColor: TOKENS.actionSecondaryDisabledBg,
  },
}

export const smallContainedSecondaryButton = {
  ...containedSecondaryBase,
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  padding: "6px 12px",
  borderRadius: 8,
}
export const mediumSecondaryContainedButton = {
  ...containedSecondaryBase,
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  padding: "12px",
  borderRadius: 10,
}
export const largeSecondaryContainedButton = {
  ...containedSecondaryBase,
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  padding: "12px 20px",
  borderRadius: 12,
}

const textBase = {
  fontWeight: 600,
  color: TOKENS.actionGhostFg,
  background: "transparent",

  "&:hover": {
    boxShadow: "none",
    backgroundColor: TOKENS.actionGhostHoverBg,
    color: TOKENS.actionGhostFg,
  },

  "&.Mui-disabled": {
    opacity: 0.5,
    color: TOKENS.textDisabled,
  },
}

export const smallTextButton = {
  ...textBase,
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  padding: "6px 12px",
  borderRadius: 8,
}
export const mediumTextButton = {
  ...textBase,
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  padding: "12px",
  borderRadius: 10,
}
export const largeTextButton = {
  ...textBase,
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  padding: "12px 20px",
  borderRadius: 12,
}

const outlinedBase = {
  fontWeight: 600,
  color: TOKENS.textPrimary,
  borderColor: TOKENS.borderFocus,

  "&:hover": {
    borderColor: TOKENS.borderFocus,
    background: TOKENS.actionGhostHoverBg,
    color: TOKENS.textPrimary,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: TOKENS.textDisabled,
    borderColor: TOKENS.borderStrong,
    background: "transparent",
  },
}

export const smallOutlinedButton = {
  ...outlinedBase,
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  padding: "6px 12px",
  borderRadius: 8,
}
export const mediumOutlinedButton = {
  ...outlinedBase,
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  padding: "12px",
  borderRadius: 10,
}
export const largeOutlinedButton = {
  ...outlinedBase,
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  padding: "12px 20px",
  borderRadius: 12,
}

const outlinedSecondaryBase = {
  fontWeight: 600,
  color: TOKENS.textPrimary,
  borderColor: TOKENS.borderDefault,

  "&:hover": {
    borderColor: TOKENS.borderStrong,
    background: TOKENS.actionGhostHoverBg,
    color: TOKENS.textPrimary,
    boxShadow: "none",
  },

  "&.Mui-disabled": {
    color: TOKENS.textDisabled,
    borderColor: TOKENS.borderSubtle,
    background: "transparent",
  },
}

export const smallOutlinedSecondaryButton = {
  ...outlinedSecondaryBase,
  fontSize: pxToRem(11),
  lineHeight: lh(16, 11),
  padding: "6px 12px",
  borderRadius: 8,
}
export const mediumOutlinedSecondaryButton = {
  ...outlinedSecondaryBase,
  fontSize: pxToRem(13),
  lineHeight: lh(12, 13),
  padding: "12px",
  borderRadius: 10,
}
export const largeOutlinedSecondaryButton = {
  ...outlinedSecondaryBase,
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  padding: "12px 20px",
  borderRadius: 12,
}

// Re-export so the old `COLORS` import path still works for files that
// reference the symbol. (Some older overrides import COLORS from this
// module's neighbourhood.)
export { COLORS }
