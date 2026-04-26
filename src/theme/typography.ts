import { pxToRem, lh } from "./units"

// Wildcat brand typography scale.
// All variants follow size / line-height / weight per the brand guide.
// The mob* variants exist as aliases for legacy call sites; they share the
// exact same scale so a Typography swap from `text2` -> `mobText2` or vice
// versa is purely a no-op rename.

export const TYPOGRAPHY = {
  fontFamily: "inherit",
  fontSize: 16,

  // 32 / 40 / Semibold
  title1Highlighted: {
    fontSize: pxToRem(32),
    lineHeight: lh(40, 32),
    fontWeight: 600,
  },
  // 32 / 40 / Medium
  title1: {
    fontSize: pxToRem(32),
    lineHeight: lh(40, 32),
    fontWeight: 500,
  },

  // 24 / 32 / Medium
  title2: {
    fontSize: pxToRem(24),
    lineHeight: lh(32, 24),
    fontWeight: 500,
  },

  // 20 / 32 / Medium
  title3: {
    fontSize: pxToRem(20),
    lineHeight: lh(32, 20),
    fontWeight: 500,
  },

  // 16 / 24 / Medium
  text1: {
    fontSize: pxToRem(16),
    lineHeight: lh(24, 16),
    fontWeight: 500,
  },

  // 14 / 20 / Semibold
  text2Highlighted: {
    fontSize: pxToRem(14),
    lineHeight: lh(20, 14),
    fontWeight: 600,
  },
  // 14 / 20 / Medium
  text2: {
    fontSize: pxToRem(14),
    lineHeight: lh(20, 14),
    fontWeight: 500,
  },

  // 12 / 20 / Medium
  text3: {
    fontSize: pxToRem(12),
    lineHeight: lh(20, 12),
    fontWeight: 500,
  },

  // 10 / 16 / Semibold
  text4Highlighted: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 600,
  },
  // 10 / 16 / Medium
  text4: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 500,
  },

  // 8 / 12 / Medium (Small Caption per the brand guide).
  caption: {
    fontSize: pxToRem(8),
    lineHeight: lh(12, 8),
    fontWeight: 500,
  },

  // Mobile aliases — kept identical to the primary scale so legacy components
  // that opt into mob* variants stay brand-compliant. Prefer the primary
  // names above for new code.
  mobH1: {
    fontSize: pxToRem(32),
    lineHeight: lh(40, 32),
    fontWeight: 500,
  },
  mobH1Lib: {
    fontSize: pxToRem(32),
    lineHeight: lh(40, 32),
    fontWeight: 500,
  },
  mobH1SemiBold: {
    fontSize: pxToRem(32),
    lineHeight: lh(40, 32),
    fontWeight: 600,
  },

  mobH2: {
    fontSize: pxToRem(24),
    lineHeight: lh(32, 24),
    fontWeight: 500,
  },
  mobH2Lib: {
    fontSize: pxToRem(24),
    lineHeight: lh(32, 24),
    fontWeight: 500,
  },
  mobH2SemiBold: {
    fontSize: pxToRem(24),
    lineHeight: lh(32, 24),
    fontWeight: 600,
  },

  mobH3: {
    fontSize: pxToRem(20),
    lineHeight: lh(32, 20),
    fontWeight: 500,
  },
  mobH3Lib: {
    fontSize: pxToRem(20),
    lineHeight: lh(32, 20),
    fontWeight: 500,
  },
  mobH3SemiBold: {
    fontSize: pxToRem(20),
    lineHeight: lh(32, 20),
    fontWeight: 600,
  },

  mobText1: {
    fontSize: pxToRem(16),
    lineHeight: lh(24, 16),
    fontWeight: 500,
  },
  mobText2: {
    fontSize: pxToRem(14),
    lineHeight: lh(20, 14),
    fontWeight: 500,
  },
  mobText2SemiBold: {
    fontSize: pxToRem(14),
    lineHeight: lh(20, 14),
    fontWeight: 600,
  },
  mobText3: {
    fontSize: pxToRem(12),
    lineHeight: lh(20, 12),
    fontWeight: 500,
  },
  mobText3SemiBold: {
    fontSize: pxToRem(12),
    lineHeight: lh(20, 12),
    fontWeight: 600,
  },
  mobText4: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 500,
  },
  mobText4SemiBold: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 600,
  },
} as const
