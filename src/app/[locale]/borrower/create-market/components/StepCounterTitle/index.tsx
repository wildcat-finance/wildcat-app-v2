import * as React from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { TitleContainer, TitleDot } from "./style"

export const StepCounterTitle = ({
  current,
  total,
}: {
  current?: number
  total: number
}) => (
  <Box sx={TitleContainer}>
    <Typography variant="text3" color={COLORS.santasGrey}>
      Creating a New Market
    </Typography>

    {current && (
      <>
        <Box sx={TitleDot} />

        <Typography variant="text3" color={COLORS.santasGrey}>
          {`${current}/${total}`}
        </Typography>
      </>
    )}
  </Box>
)
