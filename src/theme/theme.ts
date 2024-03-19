import { createTheme } from "@mui/material"
import { TYPOGRAPHY } from "@/theme/typography"
import { PALETTE } from "@/theme/palette"
import { COLORS } from "./colors"

import DownArrow from "../assets/icons/downArrow20_icon.svg"

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
    tiny: true
    small: true
    medium: true
    big: true
    huge: true
  }
}

declare module "@mui/material/TextField" {
  interface TextFieldPropsSizeOverrides {
    regular: true
    medium: true
    small: true
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
  palette: PALETTE,
  typography: TYPOGRAPHY,
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
        {
          props: { fontSize: "tiny" },
          style: {
            fontSize: "10px",
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          height: "fit-content",
          display: "flex",
          alignItems: "center",
          columnGap: "2px",
          borderRadius: "4px",
          padding: "0 8px",
          ...(ownerState.variant === "filled" && {
            "& .MuiChip-label": {
              position: "relative",
              top: "0.7px",
              fontSize: "10px",
              fontWeight: 500,

              padding: "2px 0",
            },
            "& .MuiChip-icon": {
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
      variants: [
        {
          props: { size: "regular" },
          style: {
            height: "52px",
          },
        },
        {
          props: { size: "medium" },
          style: {
            height: "44px",
          },
        },
        {
          props: { size: "small" },
          style: {
            height: "32px",
          },
        },
      ],
      defaultProps: {
        variant: "filled",
        size: "regular",
        autoComplete: "off",
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          width: "260px",

          ...(ownerState.disabled && {
            "& .MuiTypography-root": {
              color: COLORS.greySuit,
            },
          }),
          ...(ownerState.variant === "filled" &&
            ownerState.size === "regular" && {
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
                color: COLORS.blackRock,

                backgroundColor: "transparent",
                borderRadius: 12,
                border: `1px solid ${COLORS.whiteLilac}`,
                paddingRight: "16px",
                transition: "border 0.2s",

                "&:hover": {
                  borderColor: COLORS.greySuit,
                  backgroundColor: "transparent",
                },

                "&.Mui-focused": {
                  borderColor: COLORS.blackRock07,
                  backgroundColor: "transparent",
                },

                "&.Mui-error": {
                  borderColor: COLORS.wildWatermelon,
                },

                "&.Mui-disabled": {
                  color: COLORS.greySuit,
                  borderColor: COLORS.whiteLilac,
                  background: "transparent",
                },
              },

              "& .MuiFormHelperText-root": {
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiInputBase-input": {
                padding: "24px 16px 8px",
              },

              "& .MuiFormLabel-root": {
                fontSize: 12,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",
                transform: "translate(17px, 15px) scale(1)",

                "&.Mui-focused": {
                  transform: "translate(17px, 9px) scale(0.75)",
                  color: COLORS.santasGrey,
                  backgroundColor: "transparent !important",
                },

                "&.MuiInputLabel-shrink": {
                  transform: "translate(17px, 9px) scale(0.75)",
                  color: COLORS.santasGrey,
                },

                "&.Mui-disabled": {
                  color: COLORS.iron,
                },

                "&.Mui-error": {
                  color: COLORS.santasGrey,
                },
              },
            }),
          ...(ownerState.variant === "filled" &&
            ownerState.size === "medium" && {
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
                color: COLORS.blackRock,

                backgroundColor: "transparent",
                borderRadius: 12,
                border: `1px solid ${COLORS.whiteLilac}`,
                paddingRight: "16px",
                transition: "border 0.2s",

                "&:hover": {
                  borderColor: COLORS.greySuit,
                  backgroundColor: "transparent",
                },

                "&.Mui-focused": {
                  borderColor: COLORS.blackRock07,
                  backgroundColor: "transparent",
                },

                "&.Mui-error": {
                  borderColor: COLORS.wildWatermelon,
                },

                "&.Mui-disabled": {
                  borderColor: COLORS.whiteLilac,
                  background: "transparent",
                },
              },

              "& .MuiFormHelperText-root": {
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiInputBase-input": {
                padding: "18px 16px 6px",
              },

              "& .MuiFormLabel-root": {
                fontSize: 12,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",

                transform: "translate(17px, 12px) scale(1)",

                "&.Mui-focused": {
                  transform: "translate(17px, 7px) scale(0.8)",
                  color: COLORS.santasGrey,
                  backgroundColor: "transparent !important",
                },

                "&.MuiInputLabel-shrink": {
                  fontSize: 10,
                  fontWeight: 500,
                  lineHeight: "16px",

                  transform: "translate(17px, 7px) scale(0.8)",
                  color: COLORS.santasGrey,
                },

                "&.Mui-error": {
                  borderColor: COLORS.wildWatermelon,
                },

                "&.Mui-disabled": {
                  color: COLORS.iron,
                },
              },
            }),
          ...(ownerState.variant === "filled" &&
            ownerState.size === "small" && {
              "& .MuiFilledInput-underline": {
                "&::before": {
                  borderBottom: "none !important",
                },
                "&::after": {
                  borderBottom: "none !important",
                },
              },

              "& .MuiInputBase-root": {
                fontSize: 10,
                fontWeight: 500,
                lineHeight: "16px",
                paddingLeft: "8px",
                color: COLORS.blackRock,

                display: "flex",
                alignItems: "center",

                backgroundColor: "transparent",
                borderRadius: 8,
                border: `1px solid ${COLORS.whiteLilac}`,
                transition: "border 0.2s",

                "&:hover": {
                  borderColor: COLORS.greySuit,
                  backgroundColor: "transparent",
                },

                "&.Mui-focused": {
                  borderColor: COLORS.blackRock07,
                  backgroundColor: "transparent",
                },

                "&.Mui-disabled": {
                  borderColor: COLORS.whiteLilac,
                  background: "transparent",
                },
              },

              "& .MuiFormHelperText-root": {
                margin: "4px 0 0",
              },

              "& .MuiInputBase-input": {
                padding: "8px 6px 8px 4px",
              },

              "& .MuiFormLabel-root": {
                fontSize: 10,
                fontWeight: 500,
                lineHeight: "16px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",

                "&.MuiInputLabel-shrink": {
                  transform: "translate(26px, 8.5px) scale(1)",

                  "&.Mui-focused": {
                    display: "none",
                  },
                },

                "&.MuiFormLabel-filled": {
                  display: "none",
                },

                "&.Mui-disabled": {
                  color: COLORS.whiteLilac,
                },
              },
            }),
        }),
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          color: COLORS.blackRock,
          margin: "0px !important",
          height: "20px",

          "&.Mui-disabled": {
            color: COLORS.greySuit,
          },
        },
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

          "&.Mui-focused": {
            transform: "translate(17px, 9px) scale(0.75)",
            color: `${COLORS.santasGrey} !important`,
            backgroundColor: "transparent !important",
          },

          "&.MuiInputLabel-shrink": {
            transform: "translate(17px, 9px) scale(0.75)",
            color: `${COLORS.santasGrey} !important`,
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: "filled",
        IconComponent: DownArrow,
        size: "medium",
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === "filled" &&
            ownerState.size === "medium" && {
              "&.MuiFilledInput-underline": {
                "&::before": {
                  borderBottom: "none !important",
                },
                "&::after": {
                  borderBottom: "none !important",
                },
              },

              "& .MuiSelect-icon": {
                top: "unset",
                right: "11px",
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
                transition: "border 0.2s",

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
          ...(ownerState.variant === "filled" &&
            ownerState.size === "small" && {
              "&.MuiFilledInput-underline": {
                "&::before": {
                  borderBottom: "none !important",
                },
                "&::after": {
                  borderBottom: "none !important",
                },
              },

              "& .MuiSelect-icon": {
                display: "none",
              },

              "&.MuiInputBase-root": {
                height: "32px",

                fontSize: 12,
                fontWeight: 500,
                lineHeight: "20px",

                backgroundColor: "transparent",
                borderRadius: 8,
                border: `1px solid ${COLORS.whiteLilac}`,
                transition: "border 0.2s",

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
                fontSize: 10,
                fontWeight: 500,
                lineHeight: "16px",

                padding: "8px 6px 8px 28px",

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
          padding: 8,
          borderRadius: "12px",
          marginTop: "2px",
          boxShadow: "0 2px 10px 0 rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiMenuItem: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          padding: "6px 12px",
          fontSize: "12px",
          lineHeight: "20px",
          fontWeight: 500,
          borderRadius: "8px",
          "&:hover": {
            background: COLORS.hintOfRed,
          },
          "&.Mui-focusVisible": {
            background: COLORS.hintOfRed,
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
        },
      },
    },
  },
})
