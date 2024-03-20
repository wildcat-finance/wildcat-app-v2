import type { Meta } from "@storybook/react"
import { InfoBox } from "@/components/InfoBox"
import { Box } from "@mui/material"

export default {
  title: "Components/InfoBox",
  component: InfoBox,
} as Meta<typeof InfoBox>

export const MarketInfoBox = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <InfoBox color="blue" text="Please, sign in your wallet" />
    <InfoBox color="red" text="Please, sign in your wallet" />
  </Box>
)
