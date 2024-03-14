import type { Meta } from "@storybook/react"
import { Box } from "@mui/material"
import { MarketStatusChip } from "@/components/extended/MarketStatusChip"

export default {
  title: "Components/Wildcat Chip",
  component: MarketStatusChip,
} as Meta<typeof MarketStatusChip>

export const Chip = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <MarketStatusChip type="healthy" />
      <MarketStatusChip type="penalty" />
      <MarketStatusChip type="delinquent" />
      <MarketStatusChip type="terminated" />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <MarketStatusChip variant="text" type="healthy" />
      <MarketStatusChip variant="text" type="penalty" />
      <MarketStatusChip variant="text" type="delinquent" />
      <MarketStatusChip variant="text" type="terminated" />
    </Box>
  </Box>
)
