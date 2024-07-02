import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"

import { BannerProps } from "./interface"
import { MarketListAlertContainer, RequestButton, TextContainer } from "./style"

export const LeadBanner = ({
  title,
  text,
  buttonText,
  buttonLink,
}: BannerProps) => (
  <Box sx={MarketListAlertContainer}>
    <Box sx={TextContainer}>
      <Typography variant="title2" sx={{ color: COLORS.white }}>
        {title}
      </Typography>
      <Typography variant="text2" sx={{ color: COLORS.white04 }}>
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
