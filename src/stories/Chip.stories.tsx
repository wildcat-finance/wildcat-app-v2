import { Box } from "@mui/material"
import type { Meta } from "@storybook/react"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketStatus } from "@/utils/marketStatus"

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
      <MarketStatusChip status={MarketStatus.HEALTHY} />
      <MarketStatusChip status={MarketStatus.PENALTY} />
      <MarketStatusChip status={MarketStatus.DELINQUENT} />
      <MarketStatusChip status={MarketStatus.TERMINATED} />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <MarketStatusChip variant="text" status={MarketStatus.HEALTHY} />
      <MarketStatusChip variant="text" status={MarketStatus.PENALTY} />
      <MarketStatusChip variant="text" status={MarketStatus.DELINQUENT} />
      <MarketStatusChip variant="text" status={MarketStatus.TERMINATED} />
    </Box>
  </Box>
)
