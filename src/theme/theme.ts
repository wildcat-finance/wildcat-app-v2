import { createTheme } from "@mui/material"

declare module "@mui/material/styles" {
  interface TypographyVariants {
    title1Highlighted: React.CSSProperties
    title1: React.CSSProperties
    title2: React.CSSProperties
    title3: React.CSSProperties
    text1: React.CSSProperties
    text2Highlighted: React.CSSProperties
    text2: React.CSSProperties
    text3: React.CSSProperties
    text4Highlighted: React.CSSProperties
    text4: React.CSSProperties
  }

  interface TypographyVariantsOptions {
    title1Highlighted: React.CSSProperties
    title1: React.CSSProperties
    title2: React.CSSProperties
    title3: React.CSSProperties
    text1: React.CSSProperties
    text2Highlighted: React.CSSProperties
    text2: React.CSSProperties
    text3: React.CSSProperties
    text4Highlighted: React.CSSProperties
    text4: React.CSSProperties
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    title1Highlighted: true
    title1: true
    title2: true
    title3: true
    text1: true
    text2Highlighted: true
    text2: true
    text3: true
    text4Highlighted: true
    text4: true
  }
}

export const theme = createTheme({
  typography: {
    title1Highlighted: {
      fontSize: 32,
      fontWeight: 600,
      lineHeight: "40px",
    },
    title1: {
      fontSize: 32,
      fontWeight: 500,
      lineHeight: "40px",
    },
    title2: {
      fontSize: 24,
      fontWeight: 500,
      lineHeight: "32px",
    },
    title3: {
      fontSize: 20,
      fontWeight: 500,
      lineHeight: "32px",
    },
    text1: {
      fontSize: 16,
      fontWeight: 500,
      lineHeight: "24px",
    },
    text2Highlighted: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: "20px",
    },
    text2: {
      fontSize: 14,
      fontWeight: 500,
      lineHeight: "20px",
    },
    text3: {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: "20px",
    },
    text4Highlighted: {
      fontSize: 10,
      fontWeight: 600,
      lineHeight: "16px",
    },
    text4: {
      fontSize: 10,
      fontWeight: 500,
      lineHeight: "16px",
    },
    caption: {
      fontSize: 8,
      fontWeight: 500,
      lineHeight: "12px",
    },
  },
})
