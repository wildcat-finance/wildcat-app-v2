"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { useAccount } from "wagmi"

import { COLORS } from "@/theme/colors"

import { BannerProps } from "./interface"
import { MarketListAlertContainer, RequestButton, TextContainer } from "./style"
import { HeaderButton } from "../Header/HeaderButton"

export const LeadBanner = ({
  title,
  text,
  buttonText,
  buttonLink,
  onClick,
}: BannerProps) => {
  const { isConnected } = useAccount()
  return (
    <Box sx={MarketListAlertContainer}>
      <Box sx={TextContainer}>
        <Typography variant="title2" sx={{ color: COLORS.white }}>
          {title}
        </Typography>
        <Typography variant="text2" sx={{ color: COLORS.white04 }}>
          {text}
        </Typography>
      </Box>
      {buttonLink && (
        <Link
          href={buttonLink.url || ""}
          target={buttonLink.isExternal ? "_blank" : "_self"}
        >
          <Button size="large" sx={RequestButton} onClick={onClick}>
            {buttonText}
          </Button>
        </Link>
      )}
      {!isConnected && <HeaderButton />}
    </Box>
  )
}
