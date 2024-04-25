import { Box } from "@mui/material"
import type { Meta } from "@storybook/react"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"

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
      <MarketStatusChip status="healthy" />
      <MarketStatusChip status="penalty" />
      <MarketStatusChip status="delinquent" />
      <MarketStatusChip status="terminated" />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <MarketStatusChip variant="text" status="healthy" />
      <MarketStatusChip variant="text" status="penalty" />
      <MarketStatusChip variant="text" status="delinquent" />
      <MarketStatusChip variant="text" status="terminated" />
    </Box>
  </Box>
)
