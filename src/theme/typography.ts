import { pxToRem, lh } from "./units"

export const TYPOGRAPHY = {
  fontFamily: "inherit",
  fontSize: 16,

  title1Highlighted: {
    fontSize: pxToRem(36),
    lineHeight: lh(44, 36),
    fontWeight: 600,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(32),
      lineHeight: lh(40, 32),
    },
  },
  title1: {
    fontSize: pxToRem(36),
    lineHeight: lh(44, 36),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(32),
      lineHeight: lh(40, 32),
    },
  },

  title2: {
    fontSize: pxToRem(24),
    lineHeight: lh(32, 24),
    fontWeight: 500,
  },

  title3: {
    fontSize: pxToRem(18),
    lineHeight: lh(24, 18),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(20),
      lineHeight: lh(32, 20),
    },
  },

  text1: {
    fontSize: pxToRem(16),
    lineHeight: lh(28, 16),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      lineHeight: lh(24, 16),
    },
  },

  text2Highlighted: {
    fontSize: pxToRem(14),
    lineHeight: lh(24, 14),
    fontWeight: 600,
    "@media (min-width:1000px)": {
      lineHeight: lh(20, 14),
    },
  },
  text2: {
    fontSize: pxToRem(14),
    lineHeight: lh(24, 14),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      lineHeight: lh(20, 14),
    },
  },

  text3: {
    fontSize: pxToRem(12),
    lineHeight: lh(20, 12),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(13),
      lineHeight: lh(20, 13),
    },
  },

  text4Highlighted: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 600,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(11),
      lineHeight: lh(16, 11),
    },
  },
  text4: {
    fontSize: pxToRem(10),
    lineHeight: lh(16, 10),
    fontWeight: 500,
    "@media (min-width:1000px)": {
      fontSize: pxToRem(11),
      lineHeight: lh(16, 11),
    },
  },

  caption: {
    fontSize: pxToRem(8),
    lineHeight: lh(12, 8),
    fontWeight: 500,
  },

  mobH1: {
    fontSize: pxToRem(36),
    lineHeight: lh(44, 36),
    fontWeight: 500,
  },
  mobH1Lib: {
    fontSize: pxToRem(36),
    lineHeight: lh(44, 36),
    fontWeight: 500,
  },
  mobH1SemiBold: {
    fontSize: pxToRem(36),
    lineHeight: lh(44, 36),
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
    fontSize: pxToRem(18),
    lineHeight: lh(24, 18),
    fontWeight: 500,
  },
  mobH3Lib: {
    fontSize: pxToRem(18),
    lineHeight: lh(24, 18),
    fontWeight: 500,
  },
  mobH3SemiBold: {
    fontSize: pxToRem(18),
    lineHeight: lh(24, 18),
    fontWeight: 600,
  },

  mobText1: {
    fontSize: pxToRem(16),
    lineHeight: lh(28, 16),
    fontWeight: 500,
  },
  mobText2: {
    fontSize: pxToRem(14),
    lineHeight: lh(24, 14),
    fontWeight: 500,
  },
  mobText2SemiBold: {
    fontSize: pxToRem(14),
    lineHeight: lh(24, 14),
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
