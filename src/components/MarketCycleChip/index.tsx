import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

export type MarketCycleChipProps = {
  status: MarketStatus
  time: string
}

export const MarketCycleChip = ({ status, time }: MarketCycleChipProps) => (
  <Box display="flex" columnGap="4px" alignItems="center" marginLeft="12px">
    <Typography variant="text4" sx={{ margin: 0 }}>
      Ongoing Cycle
    </Typography>
    <Box
      sx={{
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        backgroundColor:
          status === MarketStatus.HEALTHY
            ? COLORS.ultramarineBlue
            : COLORS.carminePink,
      }}
    />
    <Typography
      variant="text4"
      sx={{
        color:
          status === MarketStatus.HEALTHY
            ? COLORS.ultramarineBlue
            : COLORS.carminePink,
      }}
    >
      {time} left
    </Typography>
  </Box>
)
