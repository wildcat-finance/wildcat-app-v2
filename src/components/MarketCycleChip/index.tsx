import { Box, Typography } from "@mui/material"
import { COLORS } from "@/theme/colors"

export type MarketCycleChipProps = {
  color: "blue" | "red"
  time: string
}

export const MarketCycleChip = ({ color, time }: MarketCycleChipProps) => (
  <Box display="flex" columnGap="4px" alignItems="center">
    <Typography variant="text4">Ongoing Cycle</Typography>
    <Box
      sx={{
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        backgroundColor:
          color === "blue" ? COLORS.ultramarineBlue : COLORS.carminePink,
      }}
    />
    <Typography variant="text4" sx={{ color: color === "blue" ? COLORS.ultramarineBlue : COLORS.carminePink }}>
      {time} left
    </Typography>
  </Box>
)
