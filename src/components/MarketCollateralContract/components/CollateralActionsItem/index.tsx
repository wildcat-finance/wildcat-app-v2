import { ReactNode } from "react"

import { Box, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type CollateralActionsItemProps = {
  label: string
  amount: string | number | undefined
  asset: string | undefined
  convertedAmount: string | number | undefined
  children: ReactNode
  marginBottom?: string
  tooltip?: string
}

export const CollateralActionsItem = ({
  label,
  amount,
  tooltip,
  asset,
  convertedAmount,
  children,
  marginBottom,
}: CollateralActionsItemProps) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      marginBottom,
    }}
  >
    <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <Typography variant="text2">{label}</Typography>
      {tooltip && <TooltipButton value={tooltip} />}
    </Box>

    <Box
      sx={{
        width: "50%",
        padding: "12px 16px",
        backgroundColor: COLORS.hintOfRed,
        borderRadius: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box>
        <Box sx={{ display: "flex", gap: "4px" }}>
          <Typography variant="text2">{amount}</Typography>
          <Typography variant="text4" marginTop="1px">
            {asset}
          </Typography>
        </Box>
        <Typography variant="text4" color={COLORS.santasGrey}>
          {convertedAmount}
        </Typography>
      </Box>
      {children}
    </Box>
  </Box>
)
