import type { Meta } from "@storybook/react"
import { Box } from "@mui/material"
import { WildcatChip } from "../components/WildcatChip"

export default {
  title: "Components/Wildcat Chip",
  component: WildcatChip,
} as Meta<typeof WildcatChip>

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
      <WildcatChip type="healthy" />
      <WildcatChip type="penalty" />
      <WildcatChip type="delinquent" />
      <WildcatChip type="terminated" />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <WildcatChip variant="text" type="healthy" />
      <WildcatChip variant="text" type="penalty" />
      <WildcatChip variant="text" type="delinquent" />
      <WildcatChip variant="text" type="terminated" />
    </Box>
  </Box>
)
