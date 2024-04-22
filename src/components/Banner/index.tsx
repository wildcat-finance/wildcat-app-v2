import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import {
  MarketListAlertContainer,
  RequestButton,
  TextContainer,
} from "@/components/LinkAlert/style"

export const LinkAlert = () => {
  const alertState = "whitelist"

  return (
    <Box className="test" sx={MarketListAlertContainer}>
      <Box sx={TextContainer}>
        <Typography variant="title2">Apply to become a borrower</Typography>
        <Typography variant="text2" sx={{ color: "#FFFFFF99" }}>
          We see you aren&apos;t whitelisted as a borrower. Please complete this
          Typeform and we&apos;ll reach out for next steps.
        </Typography>
      </Box>
      <Link href="https://forms.gle/irca7KeC7ASmkRh16" target="_blank">
        <Button size="large" sx={RequestButton}>
          Leave a Request
        </Button>
      </Link>
    </Box>
  )
}
