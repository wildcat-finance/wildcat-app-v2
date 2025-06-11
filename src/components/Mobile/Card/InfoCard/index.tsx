import { Box, Divider, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type InfoCardProps = {
  status: React.ReactNode
  apr: React.ReactNode
  term: React.ReactNode
  name: string
  capacityLeft: string | number
  icon?: React.ReactNode
  asset: string | React.ReactNode
  rightText: string | React.ReactNode
  bottomLeftIcon?: React.ReactNode
  bottomLeftTextColor?: string
  totalDebt: string | number
  leftButton?: React.ReactNode
  rightButton?: React.ReactNode
  aprIcon?: React.ReactNode
}

export const InfoCard = ({
  status,
  apr,
  term,
  name,
  capacityLeft,
  icon,
  asset,
  rightText,
  bottomLeftIcon,
  bottomLeftTextColor,
  totalDebt,
  leftButton,
  rightButton,
  aprIcon,
}: InfoCardProps) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      padding: "12px",
      borderRadius: "14px",
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box display="flex" gap="8px" alignItems="center">
        {status}
        <Box display="flex" alignItems="center" gap="4px">
          <Typography variant="text4">APR</Typography>
          <Typography variant="text4">{apr}</Typography>
          {aprIcon && <Box>{aprIcon}</Box>}
        </Box>
      </Box>
      <Box display="flex">{term}</Box>
    </Box>
    <Box display="flex" flexDirection="column" gap="2px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="text2">{name}</Typography>
        <Box display="flex" alignItems="center" gap="2px">
          <Typography variant="text2">{capacityLeft}</Typography>
          <Typography variant="text2">{asset}</Typography>
        </Box>
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap="6px">
          {icon}
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
          {totalDebt}
        </Typography>
      </Box>
      <Box display="flex" gap="4px">
        {leftButton}
        {rightButton}
      </Box>
    </Box>
  </Box>
)
