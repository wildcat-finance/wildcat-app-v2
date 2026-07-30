import { Box, Skeleton, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { MarketLiveDataStatus } from "@/utils/marketLiveData"

export const LiveMarketDataValue = ({
  status,
  children,
  width = 64,
  height = 20,
}: {
  status: MarketLiveDataStatus
  children: React.ReactNode
  width?: number | string
  height?: number
}) => {
  if (status === "ready") return children

  if (status === "loading") {
    return (
      <Skeleton aria-hidden variant="rounded" width={width} height={height} />
    )
  }

  return (
    <Typography
      aria-hidden
      component="span"
      variant="text3"
      color={COLORS.santasGrey}
    >
      —
    </Typography>
  )
}

export const MarketLiveDataNotice = ({
  status,
  message,
}: {
  status: MarketLiveDataStatus
  message: string
}) => {
  if (status !== "unavailable") return null

  return (
    <Box
      role="alert"
      sx={{
        margin: { xs: "8px 0 0", md: "12px 24px 0" },
        padding: "8px 12px",
        borderRadius: "8px",
        backgroundColor: COLORS.whiteSmoke,
      }}
    >
      <Typography variant="text4" color={COLORS.santasGrey}>
        {message}
      </Typography>
    </Box>
  )
}
