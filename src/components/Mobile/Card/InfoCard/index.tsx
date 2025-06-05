import { Box, Divider, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { InfoCardProps } from "./interface"

export const InfoCard = ({
  statusChip,
  statusText,
  cycleChip,
  title,
  value,
  leftText,
  rightText,
  bottomLeftText,
  leftButton,
  rightButton,
  icon,
  bottomLeftIcon,
  bottomLeftTextColor,
  statusTooltip,
}: InfoCardProps) => (
  <Box
    sx={{
      width: "367",
      height: "152px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      background: COLORS.white,
      padding: "12px",
      borderRadius: "14px",
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box display="flex" gap="8px">
        {statusChip}
        <Box display="flex" alignItems="center" gap="4px">
          <Typography variant="text4">{statusText}</Typography>
          {statusTooltip}
        </Box>
      </Box>
      <Box display="flex">{cycleChip}</Box>
    </Box>

    <Box display="flex" flexDirection="column" gap="2px">
      <Box display="flex" justifyContent="space-between">
        <Typography variant="text2">{title}</Typography>
        <Typography variant="text2">{value}</Typography>
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap="6px">
          {icon}
          <Typography variant="text4">{leftText}</Typography>
        </Box>
        <Typography variant="text4" color={COLORS.santasGrey}>
          {rightText}
        </Typography>
      </Box>
    </Box>

    <Divider />

    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box display="flex" alignItems="center" gap="4px">
        {bottomLeftIcon && <Box>{bottomLeftIcon}</Box>}
        <Typography
          variant="text4"
          color={bottomLeftTextColor || COLORS.santasGrey}
        >
          {bottomLeftText}
        </Typography>
      </Box>

      <Box display="flex" gap="4px">
        {leftButton}
        {rightButton}
      </Box>
    </Box>
  </Box>
)
