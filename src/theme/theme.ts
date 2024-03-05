import { createTheme } from "@mui/material"
import { COLORS } from "./colors"

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
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          boxShadow: "none",
          textTransform: "none",
          ...(ownerState.variant === "contained" &&
            ownerState.size === "small" && {
              height: 28,
              padding: "6px 12px",
              borderRadius: 8,
              backgroundColor: COLORS.buttonBackground,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              "&:hover": {
                background: COLORS.buttonBackgroundHoverDark,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.buttonTextLight,
                backgroundColor: COLORS.buttonBackgroundDisabled,
              },
            }),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "medium" && {
              height: 32,
              padding: "6px 12px",
              borderRadius: 8,
              backgroundColor: COLORS.buttonBackground,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              "&:hover": {
                background: COLORS.buttonBackgroundHoverDark,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.buttonTextLight,
                backgroundColor: COLORS.buttonBackgroundDisabled,
              },
            }),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "large" && {
              height: 40,
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: "#2E2E2E",

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: "#FFFFFF",
              "&:hover": {
                background: COLORS.buttonBackgroundHoverDark,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.buttonTextLight,
                backgroundColor: COLORS.buttonBackgroundDisabled,
              },
            }),
          ...(ownerState.variant === "text" &&
            ownerState.size === "small" && {
              height: 28,
              padding: "6px 12px",
              borderRadius: 8,
              background: "transparent",

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.buttonBackgroundHoverLight,
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "text" &&
            ownerState.size === "medium" && {
              height: 32,
              padding: "6px 12px",
              borderRadius: 8,
              background: "transparent",

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.buttonBackgroundHoverLight,
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "text" &&
            ownerState.size === "large" && {
              height: 40,
              padding: "10px 20px",
              borderRadius: 12,
              background: "transparent",

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.buttonText,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.buttonBackgroundHoverLight,
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.size === "small" && {
              height: 28,
              padding: "6px 12px",
              borderRadius: 8,
              borderColor: COLORS.buttonBorderDark,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderDark,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.size === "medium" && {
              height: 32,
              padding: "6px 12px",
              borderRadius: 8,
              borderColor: COLORS.buttonBorderDark,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderDark,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.size === "large" && {
              height: 40,
              padding: "10px 20px",
              borderRadius: 12,
              borderColor: COLORS.buttonBorderDark,
              background: "transparent",

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderDark,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "small" && {
              height: 28,
              padding: "6px 12px",
              borderRadius: 8,
              borderColor: COLORS.buttonBorderLight,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderLight,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "medium" && {
              height: 32,
              padding: "6px 12px",
              borderRadius: 8,
              borderColor: COLORS.buttonBorderLight,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderLight,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "large" && {
              height: 40,
              padding: "10px 20px",
              borderRadius: 12,
              borderColor: COLORS.buttonBorderLight,

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.buttonText,
              "&:hover": {
                borderColor: COLORS.buttonBorderLight,
                background: COLORS.buttonBackgroundHoverLight,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
        }),
      },
    },
  },
})
