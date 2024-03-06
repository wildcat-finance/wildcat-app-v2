import { Box, Button, Tooltip } from "@mui/material"
import type { Meta } from "@storybook/react"

export default {
  title: "Components/Tooltip",
  component: Tooltip,
} as Meta<typeof Tooltip>

export const ThemedTooltip = () => (
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
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Tooltip title="Description here" placement="right" open>
        <Button variant="contained" size="large">
          Label
        </Button>
      </Tooltip>
    </Box>
  </Box>
)
