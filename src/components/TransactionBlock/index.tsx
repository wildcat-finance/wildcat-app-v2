import * as React from "react"

import { Box, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { TransactionBlockProps } from "@/components/TransactionBlock/interface"
import { COLORS } from "@/theme/colors"

import { AmountContainer, BlockContainer, TitleContainer } from "./style"

export const TransactionBlock = ({
  title,
  tooltip,
  amount,
  warning,
  asset,
  children,
}: TransactionBlockProps) => (
  <Box sx={BlockContainer}>
    <Box>
      <Box sx={TitleContainer}>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {title}
        </Typography>
        <TooltipButton value={tooltip} />
      </Box>

      <Box sx={AmountContainer}>
        <Typography
          variant="title3"
          sx={{
            color: warning ? COLORS.carminePink : "",
          }}
        >
          {amount}
        </Typography>
        <Typography
          variant="text4"
          sx={{
            marginTop: "4px",
            color: warning ? COLORS.carminePink : "",
          }}
        >
          {asset}
        </Typography>
      </Box>
    </Box>

    {children}
  </Box>
)
