import { createTheme } from "@mui/material"
import { COLORS } from "./colors"

declare module "@mui/material/styles" {
  interface Palette {
    blueRibbon: Palette["primary"]
    dullRed: Palette["primary"]
    butteredRum: Palette["primary"]
    santasGrey: Palette["primary"]
  }

  interface PaletteOptions {
    blueRibbon?: PaletteOptions["primary"]
    dullRed?: PaletteOptions["primary"]
    butteredRum?: PaletteOptions["primary"]
    santasGrey?: PaletteOptions["primary"]
  }
}

declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsColorOverrides {
    blueRibbon: true
    dullRed: true
    butteredRum: true
    santasGrey: true
  }
}

declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsSizeOverrides {
    small: true
    medium: true
    big: true
    huge: true
  }
}

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
  palette: {
    blueRibbon: {
      main: "#3E68FF",
    },
    dullRed: {
      main: "#C24647",
    },
    butteredRum: {
      main: "#9E7A11",
    },
    santasGrey: {
      main: "#A0A0B0",
    },
  },
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
    MuiSvgIcon: {
      variants: [
        {
          props: { fontSize: "huge" },
          style: {
            fontSize: "30px",
          },
        },
        {
          props: { fontSize: "big" },
          style: {
            fontSize: "20px",
          },
        },
        {
          props: { fontSize: "medium" },
          style: {
            fontSize: "16px",
          },
        },
        {
          props: { fontSize: "small" },
          style: {
            fontSize: "12px",
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          height: "fit-content",
          display: "flex",
          columnGap: "2px",
          borderRadius: "4px",
          padding: "0 8px",
          ...(ownerState.variant === "filled" && {
            "& .MuiChip-label": {
              fontSize: "10px",
              lineHeight: "16px",
              fontWeight: 500,

              padding: 0,
            },
            "& .MuiChip-icon": {
              color: "none",
              margin: 0,
            },
          }),
          ...(ownerState.variant === "outlined" && {
            border: "none",
            padding: 0,
            "& .MuiChip-label": {
              fontSize: "10px",
              lineHeight: "16px",
              fontWeight: 500,

              padding: 0,
            },
            "& .MuiChip-icon": {
              margin: 0,
            },
          }),
        }),
      },
    },
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
              backgroundColor: COLORS.bunker,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              "&:hover": {
                background: COLORS.blackRock,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.santasGrey,
                backgroundColor: COLORS.athensGrey,
              },
            }),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "medium" && {
              height: 32,
              padding: "6px 12px",
              borderRadius: 8,
              backgroundColor: COLORS.bunker,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              "&:hover": {
                background: COLORS.blackRock,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.santasGrey,
                backgroundColor: COLORS.athensGrey,
              },
            }),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "large" && {
              height: 40,
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: COLORS.bunker,

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.white,
              "&:hover": {
                background: COLORS.blackRock,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                color: COLORS.santasGrey,
                backgroundColor: COLORS.athensGrey,
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
              color: COLORS.bunker,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.blackRock03,
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
              color: COLORS.bunker,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.blackRock03,
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
              color: COLORS.bunker,
              "&:hover": {
                boxShadow: "none",
                backgroundColor: COLORS.blackRock03,
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
              borderColor: COLORS.blackRock,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.blackRock,
                background: COLORS.blackRock03,
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
              borderColor: COLORS.blackRock,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.blackRock,
                background: COLORS.blackRock03,
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
              borderColor: COLORS.blackRock,
              background: "transparent",

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.blackRock,
                background: COLORS.blackRock03,
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
              borderColor: COLORS.iron,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.iron,
                background: COLORS.blackRock03,
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
              borderColor: COLORS.iron,

              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.iron,
                background: COLORS.blackRock03,
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
              borderColor: COLORS.iron,

              fontSize: 14,
              fontWeight: 600,
              lineHeight: "20px",
              color: COLORS.bunker,
              "&:hover": {
                borderColor: COLORS.iron,
                background: COLORS.blackRock03,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                opacity: 0.6,
              },
            }),
        }),
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: () => ({
          width: 36,
          height: 20,
          borderRadius: 10,
          padding: 0,
          display: "flex",
          "&:active": {
            "& .MuiSwitch-thumb": {
              width: 15,
            },
          },
          "& .MuiSwitch-switchBase": {
            padding: 2,
            "&.Mui-checked": {
              transform: "translateX(16px)",
              color: COLORS.white,
              "& + .MuiSwitch-track": {
                opacity: 0.3,
                backgroundColor: COLORS.white,
              },
            },
          },
          "& .MuiSwitch-thumb": {
            width: 16,
            height: 16,
            borderRadius: 8,
            transition: theme.transitions.create(["width"], {
              duration: 200,
            }),
          },
          "& .MuiSwitch-track": {
            borderRadius: 16 / 2,
            opacity: 0.3,
            backgroundColor: COLORS.white,
            boxSizing: "border-box",
          },
          "& .MuiButtonBase-root.MuiSwitch-switchBase:hover": {
            backgroundColor: "transparent",
          },
        }),
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: () => ({
          minWidth: "120px",
          padding: "12px",
          border: "none",
          borderRadius: "8px",

          fontSize: 10,
          fontWeight: 500,
          lineHeight: "16px",
          letterSpacing: "0.2px",
          color: COLORS.white,
          backgroundColor: COLORS.blackRock,

          "& .MuiTooltip-arrow": {
            height: "4px",
            width: "10px",
            color: COLORS.blackRock,
          },
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: () => ({
          height: "1px",
          padding: "0px",
          borderColor: COLORS.athensGrey,
        }),
      },
    },
    MuiRadio: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          "&.MuiRadio-root": {
            border: `1px solid ${COLORS.iron}`,
            padding: "0px",
            transition: "border 0.2s",
            "&:hover": {
              borderColor: COLORS.santasGrey,
            },
          },
        },
      },
    },
    MuiCheckbox: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          "&.MuiCheckbox-root": {
            padding: "0px",
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "filled",
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === "filled" && {
            "& .MuiFormHelperText-root": {
              margin: "4px 0 0",
              "&.Mui-error": {
                color: COLORS.wildWatermelon,
              },
            },
            "& .MuiFilledInput-underline": {
              "&::before": {
                borderBottom: "none !important",
              },
              "&::after": {
                borderBottom: "none !important",
              },
            },
            "& .MuiInputBase-root": {
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "20px",

              backgroundColor: "transparent",
              borderRadius: 12,
              border: `1px solid ${COLORS.whiteLilac}`,
              paddingRight: "16px",

              "&:hover": {
                borderColor: COLORS.greySuit,
                backgroundColor: "transparent",
              },

              "&.Mui-focused": {
                borderColor: COLORS.black07,
                backgroundColor: "transparent",
              },
            },
            "& .MuiInputBase-root.Mui-error": {
              borderColor: COLORS.wildWatermelon,
            },
            "& .MuiInputBase-input": {
              padding: "24px 16px 8px",
            },
          }),
          "& .MuiFormLabel-root": {
            fontSize: 12,
            fontWeight: 500,
            lineHeight: "20px",
            color: COLORS.santasGrey,
            letterSpacing: "0.2px",

            top: "0px",
            left: "5px",

            "&.Mui-focused": {
              left: "5px",
              top: "3px",
              color: COLORS.santasGrey,
              backgroundColor: "transparent !important",
            },

            "&.MuiInputLabel-shrink": {
              left: "5px",
              top: "3px",
              color: "rgba(0, 0, 0, 0.2) !important",
            },

            "&.Mui-error": {
              color: "rgba(0, 0, 0, 0.2)",
            },
          },
        }),
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: 12,
          fontWeight: 500,
          lineHeight: "20px",
          color: COLORS.santasGrey,
          letterSpacing: "0.2px",
          top: "0px",
          left: "3px",

          "&.Mui-focused": {
            left: "3px",
            top: "17px",
            color: `${COLORS.santasGrey} !important`,
            backgroundColor: "transparent !important",
          },

          "&.MuiInputLabel-shrink": {
            left: "3px",
            top: "17px",
            color: `${COLORS.santasGrey} !important`,
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: "filled",
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === "filled" && {
            "&.MuiFilledInput-underline": {
              "&::before": {
                borderBottom: "none !important",
              },
              "&::after": {
                borderBottom: "none !important",
              },
            },
            "&.MuiInputBase-root": {
              height: "52px",

              fontSize: 12,
              fontWeight: 500,
              lineHeight: "20px",

              backgroundColor: "transparent",
              borderRadius: 12,
              border: `1px solid ${COLORS.whiteLilac}`,
              paddingRight: "16px",

              "&:hover": {
                borderColor: COLORS.greySuit,
                backgroundColor: "transparent",
              },

              "&.Mui-focused": {
                borderColor: COLORS.black07,
                backgroundColor: "transparent",
              },
            },
            "&.MuiFormHelperText-root": {
              margin: "4px 0 0",
              "&.Mui-error": {
                color: COLORS.wildWatermelon,
              },
            },

            "& .MuiSelect-select": {
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "20px",

              padding: "24px 16px 8px",

              backgroundColor: "transparent !important",
              background: "transparent",
            },
          }),
        }),
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: "0",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: "fit-content !important",
          width: "260px",
          boxSizing: "border-box",
          border: `1px solid ${COLORS.athensGrey}`,
          padding: "8px 12px",
          borderRadius: "12px",
          marginTop: "2px",
          boxShadow: "0 2px 10px 0 rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          padding: 6,
          fontSize: "12px",
          lineHeight: "20px",
          fontWeight: 500,
          borderRadius: "8px",
          "&:hover": {
            background: COLORS.hintOfRed,
          },
          "&.Mui-selected": {
            background: "transparent",
            "&:hover": {
              background: COLORS.hintOfRed,
            },
          },
        },
      },
    },
  },
})
