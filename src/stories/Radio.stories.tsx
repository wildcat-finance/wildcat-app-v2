import { Box, Radio as MUIRadio } from "@mui/material"
import type { Meta } from "@storybook/react"
import Radio from "../components/extended/RadioButton"

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
      <Radio />
      <Radio defaultChecked />
      <Radio disabled />
    </Box>
  </Box>
)
