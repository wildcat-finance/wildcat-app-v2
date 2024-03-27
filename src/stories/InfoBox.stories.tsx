import type { Meta } from "@storybook/react"
import { Box } from "@mui/material"
import { Alert } from "../components/Alert"

export default {
  title: "Components/Alert",
  component: Alert,
} as Meta<typeof Alert>

export const MarketInfoBox = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <Alert color="blue" text="Please, sign in your wallet" />
    <Alert color="red" text="Please, sign in your wallet" />
  </Box>
)
