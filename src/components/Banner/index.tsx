import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import {
  MarketListAlertContainer,
  RequestButton,
  TextContainer,
} from "@/components/Banner/style"

export type BannerProps = {
  title: string | undefined
  text: string | undefined
  buttonText: string | undefined
  buttonLink: string | undefined
}

export const Banner = ({
  title,
  text,
  buttonText,
  buttonLink,
}: BannerProps) => {
  const alertState = "whitelist"

  return (
    <Box className="test" sx={MarketListAlertContainer}>
      <Box sx={TextContainer}>
        <Typography variant="title2">{title}</Typography>
        <Typography variant="text2" sx={{ color: "#FFFFFF99" }}>
          {text}
        </Typography>
      </Box>
      <Link href={buttonLink || ""} target="_blank">
        <Button size="large" sx={RequestButton}>
          {buttonText}
        </Button>
      </Link>
    </Box>
  )
}
