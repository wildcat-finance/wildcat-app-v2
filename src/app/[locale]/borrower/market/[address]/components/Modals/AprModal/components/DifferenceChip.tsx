import * as React from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { DifferenceChipProps } from "./interface"
import { ChipBox } from "./style"

export const DifferenceChip = ({
  startValue,
  endValue,
  type,
  error,
}: DifferenceChipProps) => {
  const cleanStartValue = parseFloat(startValue.replace(/[^0-9.-]/g, ""))
  const cleanEndValue = parseFloat(endValue.replace(/[^0-9.-]/g, ""))

  const difference = cleanEndValue - cleanStartValue
  const percentageDifference = (difference / cleanStartValue) * 100

  const sign = difference >= 0 ? "+" : ""

  if (difference === 0) return null

  const formattedDifference = Number.isInteger(difference)
    ? difference.toFixed(0)
    : difference.toFixed(2)

  const formattedPercentageDifference = Number.isInteger(percentageDifference)
    ? percentageDifference.toFixed(0)
    : percentageDifference.toFixed(2)

  const bgColor = difference > 0 ? COLORS.remy : COLORS.glitter
  const textColor = difference > 0 ? COLORS.wildWatermelon : COLORS.blueRibbon

  return (
    <Box
      sx={{ ...ChipBox, backgroundColor: error ? COLORS.whiteSmoke : bgColor }}
    >
      <Typography variant="text3" color={error ? COLORS.santasGrey : textColor}>
        {type === "percentage"
          ? `${sign}${formattedPercentageDifference}%`
          : `${sign}${formattedDifference}%`}
      </Typography>
      <Typography
        variant="text3"
        color={error ? COLORS.santasGrey : textColor}
        sx={{ transform: `rotate(${difference > 0 ? "0deg" : "180deg"})` }}
      >
        ↑
      </Typography>
    </Box>
  )
}
