import { ComponentType } from "react"

import { Box, SvgIcon, SxProps, Theme, Typography } from "@mui/material"

import CircledCheck from "@/assets/icons/circledCheckBlue_icon.svg"
import Info from "@/assets/icons/info_icon.svg"
import MediumWarning from "@/assets/icons/mediumWarning_icon.svg"
import RedWarning from "@/assets/icons/warning_icon.svg"
import { AlertColor, AlertProps } from "@/components/Alert/type"
import { COLORS } from "@/theme/colors"

const SUCCESS_COLOR = "#168A4A"

const ALERT_PALETTE: Record<
  AlertColor,
  {
    background: string
    color: string
    Icon: ComponentType
    viewBox?: string
    iconSx?: SxProps<Theme>
  }
> = {
  blue: {
    background: COLORS.glitter,
    color: COLORS.ultramarineBlue,
    Icon: Info,
    iconSx: { "& path": { fill: COLORS.ultramarineBlue } },
  },
  red: {
    background: COLORS.remy,
    color: COLORS.dullRed,
    Icon: RedWarning,
    viewBox: "0 0 16 16",
  },
  green: {
    background: COLORS.lightGreen,
    color: SUCCESS_COLOR,
    Icon: CircledCheck,
    iconSx: {
      "& circle": { stroke: SUCCESS_COLOR, strokeWidth: 1.5 },
      "& path": { fill: SUCCESS_COLOR },
    },
  },
  amber: {
    background: COLORS.oasis,
    color: COLORS.butteredRum,
    Icon: MediumWarning,
    viewBox: "0 0 16 16",
  },
}

export const Alert = ({ color, text, variant = "text3", sx }: AlertProps) => {
  const {
    background,
    color: textColor,
    Icon,
    viewBox,
    iconSx,
  } = ALERT_PALETTE[color]

  return (
    <Box
      role={color === "red" ? "alert" : "status"}
      sx={[
        {
          maxWidth: "460px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          padding: "12px",
          borderRadius: "12px",
          backgroundColor: background,
          color: textColor,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <SvgIcon
        aria-hidden="true"
        viewBox={viewBox}
        sx={[
          { fontSize: "16px", marginTop: "2px", flexShrink: 0 },
          ...(Array.isArray(iconSx) ? iconSx : [iconSx]),
        ]}
      >
        <Icon />
      </SvgIcon>
      <Typography variant={variant} component="div" color="inherit">
        {text}
      </Typography>
    </Box>
  )
}
