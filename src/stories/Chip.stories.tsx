import { Box } from "@mui/material"
import type { Meta } from "@storybook/react"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { HealthyStatusChip } from "@/components/@extended/MarketStatusChip/HealthyStatusChip"
import { MarketStatus } from "@/utils/marketStatus"

export default {
  title: "Components/Wildcat Chip",
  component: MarketStatusChip,
} as Meta<typeof MarketStatusChip>

const mockData = [
  { status: MarketStatus.HEALTHY, healthyPeriod: 0, penaltyPeriod: 0 },
  { status: MarketStatus.PENALTY, healthyPeriod: 0, penaltyPeriod: 0 },
  { status: MarketStatus.DELINQUENT, healthyPeriod: 0, penaltyPeriod: 0 },
  { status: MarketStatus.TERMINATED, healthyPeriod: 0, penaltyPeriod: 0 },
]

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
      {mockData.map((status) => (
        <MarketStatusChip status={status} />
      ))}
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      {mockData.map((status) => (
        <MarketStatusChip variant="text" status={status} />
      ))}
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <HealthyStatusChip msLeft={21432919000} />
      <HealthyStatusChip msLeft={166694000} />
    </Box>
  </Box>
)
