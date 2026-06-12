import { ReactNode } from "react"

import type { SxProps, Theme } from "@mui/material"
import { Box, IconButton, SvgIcon, Typography } from "@mui/material"

import Check from "@/assets/icons/check_icon.svg"
import Alert from "@/assets/icons/circledAlert_icon.svg"
import Clock from "@/assets/icons/clock_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { COLORS } from "@/theme/colors"

export type PeriodicNoticeTone = "info" | "warning" | "success"

const TONE_STYLES: Record<
  PeriodicNoticeTone,
  {
    background: string
    border: string
    icon: typeof Clock
    iconColor: string
    titleColor: string
    bodyColor: string
  }
> = {
  info: {
    background: COLORS.whiteSmoke,
    border: COLORS.iron,
    icon: Clock,
    iconColor: COLORS.greySuit,
    titleColor: COLORS.blackRock,
    bodyColor: COLORS.santasGrey,
  },
  warning: {
    background: COLORS.oasis,
    border: COLORS.galliano,
    icon: Alert,
    iconColor: COLORS.butteredRum,
    titleColor: COLORS.butteredRum,
    bodyColor: COLORS.butteredRum,
  },
  success: {
    background: COLORS.lightGreen,
    border: "transparent",
    icon: Check,
    iconColor: COLORS.blackRock,
    titleColor: COLORS.blackRock,
    bodyColor: COLORS.blackRock,
  },
}

/**
 * Shared banner for periodic-term notices (pending APR reductions, applied
 * confirmations, window notices). One visual grammar across borrower and
 * lender surfaces: leading tone icon, bold title + muted body, an optional
 * trailing action, and an optional close control.
 */
export const PeriodicNoticeBanner = ({
  tone,
  title,
  body,
  action,
  onClose,
  sx,
}: {
  tone: PeriodicNoticeTone
  title?: string
  body: ReactNode
  /** Trailing call-to-action, e.g. an Apply/Settle button. */
  action?: ReactNode
  /** When provided, renders a close (×) control that calls this. */
  onClose?: () => void
  sx?: SxProps<Theme>
}) => {
  const tones = TONE_STYLES[tone]
  const ToneIcon = tones.icon

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "14px 16px",
        borderRadius: "10px",
        backgroundColor: tones.background,
        border: `1px solid ${tones.border}`,
        ...sx,
      }}
    >
      <SvgIcon
        sx={{
          fontSize: "16px",
          flexShrink: 0,
          mt: "2px",
          "& path": { fill: tones.iconColor },
        }}
      >
        <ToneIcon />
      </SvgIcon>

      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: "10px", sm: "16px" },
        }}
      >
        <Box
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {title && (
            <Typography
              variant="text3"
              sx={{
                color: tones.titleColor,
                fontWeight: 600,
                lineHeight: "20px",
              }}
            >
              {title}
            </Typography>
          )}
          <Typography
            variant="text3"
            sx={{ color: tones.bodyColor, lineHeight: "20px" }}
          >
            {body}
          </Typography>
        </Box>

        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      {onClose && (
        <IconButton
          aria-label="dismiss notice"
          onClick={onClose}
          sx={{
            flexShrink: 0,
            padding: "2px",
            marginTop: "-2px",
            marginRight: "-6px",
            "& path": { fill: tones.iconColor },
          }}
        >
          <SvgIcon sx={{ fontSize: "16px" }}>
            <Cross />
          </SvgIcon>
        </IconButton>
      )}
    </Box>
  )
}
