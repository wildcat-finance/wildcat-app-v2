import { Box, Divider, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import { COLORS } from "@/theme/colors"

export type OtherMarketsCardProps = {
  status: string | React.ReactNode
  apr: React.ReactNode
  term: string | React.ReactNode
  name: string
  capacityLeft: string | number
  icon?: React.ReactNode
  asset: string | React.ReactNode
  borrower: string | React.ReactNode
  bottomLeftIcon?: React.ReactNode
  bottomLeftTextColor?: string
  totalDebt?: string | number
  loan?: string | React.ReactNode
  leftButton?: React.ReactNode
  rightButton?: React.ReactNode
  aprIcon?: React.ReactNode
}

export const OtherMarketsCard = ({
  status,
  apr,
  term,
  name,
  capacityLeft,
  icon,
  asset,
  borrower,
  bottomLeftIcon,
  bottomLeftTextColor,
  totalDebt,
  loan,
  leftButton,
  rightButton,
  aprIcon,
}: OtherMarketsCardProps) => (
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

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="text4">{borrower}</Typography>
        <Typography variant="text4" color={COLORS.santasGrey}>
          available to lend
        </Typography>
      </Box>

      {icon && (
        <Box display="flex" alignItems="center" gap="6px">
          {icon}
        </Box>
      )}
    </Box>

    <Divider />

    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box display="flex" alignItems="center" gap="4px">
        <Typography
          variant="text4"
          color={bottomLeftTextColor || COLORS.santasGrey}
        >
          {loan}
        </Typography>
        <Typography variant="text4" color={COLORS.santasGrey}>
          MATIC deposited
        </Typography>
      </Box>

      <Box display="flex" gap="4px">
        {leftButton}
        {rightButton}
      </Box>
    </Box>
  </Box>
)
