import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { MarketListAlertContainer, RequestButton, TextContainer } from "./style"
import { BannerProps } from "./interface"

export const LeadBanner = ({
  title,
  text,
  buttonText,
  buttonLink,
}: BannerProps) => (
  <Box className="test" sx={MarketListAlertContainer}>
    <Box sx={TextContainer}>
      <Typography variant="title2">{title}</Typography>
      <Typography variant="text2" sx={{ color: "#FFFFFF99" }}>
        {text}
      </Typography>
    </Box>
    <Link
      href={buttonLink?.url || ""}
      target={buttonLink?.isExternal ? "_blank" : "_self"}
    >
      <Button size="large" sx={RequestButton}>
        {buttonText}
      </Button>
    </Link>
  </Box>
)
