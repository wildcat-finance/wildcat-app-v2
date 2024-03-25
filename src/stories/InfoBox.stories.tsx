import type { Meta } from "@storybook/react"
import { Alert } from "@/components/InfoBox"
import { Box } from "@mui/material"

export default {
  title: "Components/InfoBox",
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
