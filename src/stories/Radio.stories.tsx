import { Box, Radio as MUIRadio } from "@mui/material"
import type { Meta } from "@storybook/react"

import ExtendedRadio from "@/components/@extended/ExtendedRadio"

export default {
  title: "Components/Radio",
  component: MUIRadio,
} as Meta<typeof MUIRadio>

export const ThemedRadioButton = () => (
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
      <ExtendedRadio />
      <ExtendedRadio defaultChecked />
      <ExtendedRadio disabled />
    </Box>
  </Box>
)
