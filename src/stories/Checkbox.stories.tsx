import { Box, Checkbox as MUICheckbox } from "@mui/material"
import type { Meta } from "@storybook/react"
import Checkbox from "../components/extended/Сheckbox"

export default {
  title: "Components/Checkbox",
  component: MUICheckbox,
} as Meta<typeof MUICheckbox>

export const ThemedCheckbox = () => (
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
      <Checkbox size="small" />
      <Checkbox />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Checkbox size="small" defaultChecked />
      <Checkbox defaultChecked />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Checkbox size="small" disabled />
      <Checkbox disabled />
    </Box>
  </Box>
)
