import { Box, Checkbox as MUICheckbox } from "@mui/material"
import type { Meta } from "@storybook/react"
import ExtendedCheckbox from "../components/extended/ExtendedСheckbox"

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
      <ExtendedCheckbox size="small" />
      <ExtendedCheckbox />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <ExtendedCheckbox size="small" defaultChecked />
      <ExtendedCheckbox defaultChecked />
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <ExtendedCheckbox size="small" disabled />
      <ExtendedCheckbox disabled />
    </Box>
  </Box>
)
