import * as React from "react"

import { createTheme, SvgIcon } from "@mui/material"

import type {} from "@mui/x-data-grid/themeAugmentation"
import type {} from "@mui/x-date-pickers/themeAugmentation"

import DownArrow from "@/assets/icons/downArrow20_icon.svg"
import AscIcon from "@/assets/icons/tableSort-ascSort_icon.svg"
import DescIcon from "@/assets/icons/tableSort-descSort_icon.svg"
import UnsortedIcon from "@/assets/icons/tableSort-unsorted_icon.svg"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { COLORS } from "@/theme/colors"
import {
  largeContainedButton,
  largeOutlinedButton,
  largeOutlinedSecondaryButton,
  largeSecondaryContainedButton,
  largeTextButton,
  mediumContainedButton,
  mediumOutlinedButton,
  mediumOutlinedSecondaryButton,
  mediumSecondaryContainedButton,
  mediumTextButton,
  smallContainedButton,
  smallContainedSecondaryButton,
  smallOutlinedButton,
  smallOutlinedSecondaryButton,
  smallTextButton,
} from "@/theme/overrides/Buttons"
import { PALETTE } from "@/theme/palette"
import { TYPOGRAPHY } from "@/theme/typography"

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
    colossal: true
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
          props: { fontSize: "colossal" },
          style: {
            fontSize: "40px",
          },
        },
        {
          props: { fontSize: "huge" },
          style: {
            fontSize: "32px",
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
          fontFamily: "inherit",
          width: "fit-content",
          height: "fit-content",
          display: "flex",
          alignItems: "center",
          columnGap: "2px",
          borderRadius: "4px",
          padding: "0 6px",
          ...(ownerState.variant === "filled" && {
            "& .MuiChip-label": {
              position: "relative",
              top: "0.7px",
              fontSize: "11px",
              lineHeight: "16px",
              fontWeight: 500,

              padding: 0,
            },
            "& .MuiChip-icon": {
              margin: 0,
            },
          }),
          ...(ownerState.variant === "outlined" && {
            border: "none",
            padding: 0,
            "& .MuiChip-label": {
              fontSize: "11px",
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
          fontFamily: "inherit",
          boxShadow: "none",
          textTransform: "none",
          letterSpacing: 0,

          ...(ownerState.variant === "contained" &&
            ownerState.size === "small" &&
            smallContainedButton),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "medium" &&
            mediumContainedButton),
          ...(ownerState.variant === "contained" &&
            ownerState.size === "large" &&
            largeContainedButton),

          ...(ownerState.variant === "text" &&
            ownerState.size === "small" &&
            smallTextButton),
          ...(ownerState.variant === "text" &&
            ownerState.size === "medium" &&
            mediumTextButton),
          ...(ownerState.variant === "text" &&
            ownerState.size === "large" &&
            largeTextButton),

          ...(ownerState.variant === "outlined" &&
            ownerState.size === "small" &&
            smallOutlinedButton),
          ...(ownerState.variant === "outlined" &&
            ownerState.size === "medium" &&
            mediumOutlinedButton),
          ...(ownerState.variant === "outlined" &&
            ownerState.size === "large" &&
            largeOutlinedButton),

          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "small" &&
            smallOutlinedSecondaryButton),
          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "medium" &&
            mediumOutlinedSecondaryButton),
          ...(ownerState.variant === "outlined" &&
            ownerState.color === "secondary" &&
            ownerState.size === "large" &&
            largeOutlinedSecondaryButton),

          ...(ownerState.variant === "contained" &&
            ownerState.color === "secondary" &&
            ownerState.size === "small" &&
            smallContainedSecondaryButton),
          ...(ownerState.variant === "contained" &&
            ownerState.color === "secondary" &&
            ownerState.size === "medium" &&
            mediumSecondaryContainedButton),
          ...(ownerState.variant === "contained" &&
            ownerState.color === "secondary" &&
            ownerState.size === "large" &&
            largeSecondaryContainedButton),
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

          fontSize: 11,
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
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.blackRock,

                backgroundColor: "transparent",
                borderRadius: 12,
                border: `1px solid ${COLORS.whiteLilac}`,
                paddingRight: "10px",
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
                fontFamily: "inherit",
                fontSize: "11px",
                lineHeight: "16px",
                fontWeight: 500,
                letterSpacing: 0,
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiInputBase-input": {
                padding: "15px",
              },

              "& .MuiFormLabel-root": {
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",
                transform: "translate(16px, 16px) scale(1)",

                "&.Mui-focused": {
                  color: COLORS.santasGrey,
                  backgroundColor: "transparent !important",
                },

                "&.MuiInputLabel-shrink": {
                  "&.Mui-focused": {
                    transform: "translate(16px, 16px) scale(1)",
                  },
                },

                "&.MuiFormLabel-filled": {
                  display: "none",
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
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.blackRock,

                backgroundColor: "transparent",
                borderRadius: 12,
                border: `1px solid ${COLORS.whiteLilac}`,
                paddingRight: "6px",
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
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 500,
                lineHeight: "16px",
                letterSpacing: 0,
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiInputBase-input": {
                padding: "11px 15px",
              },

              "& .MuiFormLabel-root": {
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",

                transform: "translate(16px, 12px) scale(1)",

                "&.Mui-focused": {
                  transform: "translate(17px, 7px) scale(0.8)",
                  color: COLORS.santasGrey,
                  backgroundColor: "transparent !important",
                },

                "&.MuiInputLabel-shrink": {
                  fontSize: 11,
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
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: "20px",
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
                letterSpacing: 0,
                fontFamily: "inherit",
                margin: "4px 0 0",
              },

              "& .MuiInputBase-input": {
                padding: "6px 6px 6px 4px",
              },

              "& .MuiFormLabel-root": {
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: "20px",
                color: COLORS.santasGrey,
                letterSpacing: "0.2px",

                "&.MuiInputLabel-shrink": {
                  transform: "translate(29px, 5.5px) scale(1)",

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
          color: COLORS.santasGrey,
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
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: "20px",
          color: COLORS.santasGrey,
          letterSpacing: "0.2px",

          "&.Mui-focused": {
            transform: "translate(16px, 16px) scale(1)",
            color: `${COLORS.santasGrey} !important`,
            backgroundColor: "transparent !important",
          },

          "&.MuiInputLabel-shrink": {
            display: "none",
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
              fontFamily: "inherit",

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

                fontSize: 14,
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
                letterSpacing: 0,
                fontFamily: "inherit",
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiSelect-select": {
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "20px",

                padding: "16px",

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

                fontSize: 13,
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
                letterSpacing: 0,
                fontFamily: "inherit",
                margin: "4px 0 0",
                "&.Mui-error": {
                  color: COLORS.wildWatermelon,
                },
              },

              "& .MuiSelect-select": {
                fontSize: 11,
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
          fontFamily: "inherit",
          padding: "6px 12px",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: "20px",
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
    MuiFormGroup: {
      styleOverrides: {
        root: {
          rowGap: "12px",
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          margin: 0,
          alignItems: "center",
          columnGap: "8px",

          "& .MuiTypography-root": {
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: "20px",
            fontWeight: 500,
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          margin: 0,
          padding: 0,
          borderRadius: 0,

          "&:hover": {
            background: "transparent",
            cursor: "pointer",
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          "& .MuiAutocomplete-popper": {
            border: "1px solid red",
          },
          "& .MuiAutocomplete-inputRoot": {
            padding: "8px 11px !important",
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: COLORS.bunker,
          letterSpacing: 0,
        },
      },
    },
    MuiDataGrid: {
      defaultProps: {
        rowSelection: false,
        disableColumnMenu: true,
        disableColumnResize: true,
        disableRowSelectionOnClick: true,
        disableColumnSelector: true,
        hideFooter: true,
        slots: {
          columnSortedDescendingIcon: DescIcon,
          columnSortedAscendingIcon: AscIcon,
          columnUnsortedIcon: UnsortedIcon,
        },
        slotProps: {
          cell: {
            title: "",
          },
        },
      },
      styleOverrides: {
        root: {
          fontFamily: "inherit",
          letterSpacing: 0,
          border: "none",

          "& .MuiDataGrid-filler": {
            display: "none",
          },

          "& .MuiDataGrid-columnHeader--sorted": {
            color: `${COLORS.blackRock} !important`,
          },

          "& .MuiDataGrid-columnHeader:focus": {
            outline: "transparent",
          },
          "& .MuiDataGrid-cell:focus": {
            outline: "transparent",
          },

          "& .MuiDataGrid-row:hover": {
            backgroundColor: COLORS.alabaster05,
          },

          "& .MuiDataGrid-iconButtonContainer": {
            width: "8px",
            visibility: "visible",
          },

          "& .MuiDataGrid-sortIcon": {
            opacity: "inherit !important",
          },

          "& .MuiDataGrid-topContainer:after": {
            display: "none",
          },

          "& .MuiDataGrid-columnHeaders": {
            "& .MuiDataGrid-filler": {
              display: "none",
            },
          },

          "& .MuiDataGrid-columnHeader--alignRight": {
            justifyContent: "flex-end",

            "& .MuiDataGrid-columnHeaderTitleContainer": {
              flexDirection: "row",
              justifyContent: "flex-end",
            },
          },

          "& .MuiDataGrid-columnHeader": {
            padding: "0 16px",

            fontSize: "11px",
            lineHeight: "12px",
            fontWeight: 500,
            letterSpacing: 0,
            color: COLORS.santasGrey,

            "& .MuiDataGrid-columnHeaderTitleContainer": {
              gap: "8px",
              margin: "16px 0 8px",
            },

            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          },

          "& .MuiDataGrid-row": {
            cursor: "pointer",

            "& .MuiDataGrid-cellEmpty": {
              display: "none",
            },

            "&:last-child": {
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid",
                borderColor: COLORS.athensGrey,
              },
            },
          },

          "& .MuiDataGrid-cell": {
            display: "flex",
            alignItems: "center",
            height: "52px",
            padding: "0 16px",
            borderColor: COLORS.athensGrey,

            fontSize: "13px",
            lineHeight: "20px",
            fontWeight: 500,
            letterSpacing: 0,
            color: COLORS.blackRock,

            whiteSpace: "nowrap",
            textOverflow: "ellipsis",

            "&:focus-within": {
              outline: "none",
            },
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          fontFamily: "inherit",
          letterSpacing: 0,
          border: "none",
          boxShadow: "none",
          padding: 0,
        },
      },
    },
    MuiAccordionSummary: {
      defaultProps: {
        expandIcon: (
          <SvgIcon fontSize="small">
            <UpArrow />
          </SvgIcon>
        ),
      },
      styleOverrides: {
        root: {
          height: "32px",
          minHeight: "0 !important",
          fontFamily: "inherit",
          letterSpacing: 0,
          backgroundColor: COLORS.hintOfRed,

          "& .MuiAccordionSummary-expandIconWrapper": {
            height: "16px",
            alignItems: "center",
          },

          "& .MuiAccordionSummary-content": {
            fontFamily: "inherit",
            fontSize: "13px",
            lineHeight: "20px",
            fontWeight: 500,
            letterSpacing: 0,
            alignItems: "center",

            margin: 0,

            "& .Mui-expanded": {
              margin: 0,
            },
          },

          "& .Mui-expanded": {
            height: "32px",
            minHeight: "0 !important",
            margin: 0,
          },
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: ({ ownerState }) => ({
          height: "36px",
          minHeight: "36px",

          fontFamily: "inherit",
          fontSize: "20px",
          fontWeight: 500,
          lineHeight: "32px",
          textTransform: "none",
          color: COLORS.santasGrey,
          letterSpacing: 0,

          borderBottom: "1px solid",
          borderColor: COLORS.iron,

          padding: "0 0 4px",

          "&.Mui-selected": {
            color: COLORS.blackRock,
          },

          ...(ownerState.className === "contained" && {
            height: "32px",
            minHeight: "32px",

            fontFamily: "inherit",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: "20px",
            textTransform: "none",
            color: COLORS.santasGrey,
            letterSpacing: 0,

            padding: "6px 54.5px",
            borderBottom: "none",

            "&.Mui-selected": {
              color: COLORS.blackRock,
              backgroundColor: COLORS.white,
              borderRadius: "8px",
            },
          }),
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          height: "36px",
          minHeight: "36px",

          "& .MuiTabs-indicator": {
            height: "1px",
            backgroundColor: COLORS.blackRock,
          },

          ...(ownerState.className === "contained" && {
            height: "40px",
            minHeight: "40px",
            width: "fit-content",
            backgroundColor: COLORS.whiteSmoke,
            borderRadius: "12px",
            padding: "4px",

            "& .MuiTabs-indicator": {
              height: "0px",
              backgroundColor: "transparent",
            },
          }),
        }),
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          transformOrigin: "0px",
          transform: "none",
        },
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: {
          height: "210px",
          overflow: "visible",
          boxSizing: "border-box",
          fontFamily: "inherit",
          maxWidth: "274px",

          "& .MuiPickersSlideTransition-root.MuiDayCalendar-slideTransition": {
            minHeight: "127px",
            overflow: "hidden",
          },

          "& .MuiPickersCalendarHeader-root": {
            justifyContent: "space-between",
            margin: "0px",
            padding: "0px",
            paddingRight: "4px",
            paddingBottom: "8px",
            minHeight: "36px",
            maxHeight: "36px",
          },
          "& .MuiDayCalendar-root": {
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          },
          "& .MuiDayCalendar-monthContainer": {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          },
          "& .MuiDayCalendar-header": {
            justifyContent: "space-between",
          },
          "& .MuiPickersCalendarHeader-labelContainer": {
            fontFamily: "inherit",
            margin: "0px 4px",
          },

          "& .MuiButtonBase-root.MuiPickersDay-root.Mui-selected": {
            backgroundColor: COLORS.cornflowerBlue,
          },

          "& .MuiPickersCalendarHeader-label": {
            fontSize: 13,
            marginRight: "0px",
          },
          "& .MuiPickersArrowSwitcher-spacer": {
            display: "none",
          },
          "& .MuiDayCalendar-weekContainer": {
            margin: "0",
            justifyContent: "space-between",
          },
          "& .MuiDayCalendar-weekDayLabel": {
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 500,
            lineHeight: "16px",
            color: COLORS.greySuit,

            width: "20px",
            height: "20px",
          },
          "& .MuiPickersDay-root": {
            fontSize: "small",
            width: "22px",
            height: "22px",

            ":focus": {
              backgroundColor: "transparent",
            },
          },
          "& .MuiPickersCalendarHeader-switchViewIcon": {
            "& path": { fill: `${COLORS.greySuit}` },
          },
          "& .MuiPickersDay-root:not(.Mui-selected)": {
            border: "none",
          },
          "& .MuiButtonBase-root.MuiPickersDay-root": {
            fontFamily: "inherit",
          },
          "& .MuiPickersYear-root": {
            width: "48px",
            height: "20px",
            flex: "0 0 calc(24% - 20px);",
          },
          "& .MuiPickersYear-yearButton": {
            fontFamily: "inherit",
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "20px",

            width: "48px",
            height: "20px",
            padding: "0",
            margin: "0",

            "&.Mui-selected": {
              backgroundColor: COLORS.cornflowerBlue,
            },
          },
          "& .MuiYearCalendar-root": {
            display: "grid",
            gridTemplateColumns: "48px 48px 48px 48px",
            padding: "0 12px 0",
            maxHeight: "150px",
            width: "274px",
            gap: "6px 13px",
            border: `1px solid ${COLORS.hintOfRed}`,
            borderRadius: "8px",
            justifyContent: "space-between",
            boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.05)",
          },
        },
      },
    },
  },
})
