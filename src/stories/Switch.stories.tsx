import { Box, Switch } from "@mui/material"
import type { Meta } from "@storybook/react"

export default {
  title: "Components/Switch",
  component: Switch,
} as Meta<typeof Switch>

export const ThemedSwitch = () => (
  <Box sx={{ backgroundColor: "#000", width: "min-content", padding: "5px" }}>
    <Switch />
  </Box>
)
