import type { Meta } from "@storybook/react"
import { Notifications } from "@/components/Notifications"
import { Box } from "@mui/material"

export default {
  title: "Components/Notifications",
  component: Notifications,
} as Meta<typeof Notifications>

export const MarketNotifications = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <Notifications
      timeAgo="1 min"
      description="You payment from 21:13 24.02 was successful"
    />
    <Notifications
      type="penalty"
      timeAgo="1 min"
      title="10% penalty rate"
      description="Your effective APR has been increased by 10% until you meet your required reserves."
    />
    <Notifications
      type="penalty"
      timeAgo="1 min"
      title="5m 34s grace left"
      description="Increase reserves by 4 ETH within this grace period to avoid a penalty."
    />
  </Box>
)
