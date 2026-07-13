"use client"

import { Box, Skeleton, Typography } from "@mui/material"

import { EChart, EChartOption } from "@/components/ECharts"
import { COLORS } from "@/theme/colors"

const ChartLoading = () => (
  <Skeleton
    variant="rounded"
    height="100%"
    sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
  />
)

const ChartEmpty = ({ message }: { message: string }) => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "16px",
    }}
  >
    <Typography variant="text3" color={COLORS.santasGrey}>
      {message}
    </Typography>
  </Box>
)

// Resolves the loading / empty / chart states for a market card chart so the
// callers stay declarative (avoids a nested ternary in the JSX).
export const ChartBody = ({
  isLoading,
  isEmpty,
  emptyMessage,
  option,
  ariaLabel,
}: {
  isLoading: boolean
  isEmpty: boolean
  emptyMessage: string
  option: EChartOption
  ariaLabel: string
}) => {
  if (isLoading) return <ChartLoading />
  if (isEmpty) return <ChartEmpty message={emptyMessage} />
  return <EChart option={option} ariaLabel={ariaLabel} />
}
