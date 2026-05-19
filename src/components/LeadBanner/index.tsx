import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"

import Image from "@/assets/pictures/bannerBG.webp"
import { COLORS } from "@/theme/colors"

type Link = {
  isExternal: boolean
  url: string
}

export type LeadBannerProps = {
  title?: string
  subtitle?: string
  buttonText?: string
  buttonLink?: Link
  buttonOnClick?: () => void
}

export const LeadBanner = ({
  title,
  subtitle,
  buttonText,
  buttonLink,
  buttonOnClick,
}: LeadBannerProps) => (
  <Box
    sx={{
      width: "100%",
      height: "min-content",

      display: "flex",
      flexDirection: "column",
      gap: "24px",

      padding: "28px 40px 32px 32px",
      borderRadius: "16px",
      color: "white",

      backgroundImage: `url(${Image.src})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    }}
  >
    <Box
      sx={{
        width: "400px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <Typography variant="title2" color={COLORS.white}>
        {title}
      </Typography>
      <Typography variant="text2" color={COLORS.white} sx={{ opacity: 0.8 }}>
        {subtitle}
      </Typography>
    </Box>

    <Button
      component={Link}
      href={buttonLink ? buttonLink.url : ""}
      target={buttonLink && buttonLink.isExternal ? "_blank" : "_self"}
      onClick={buttonOnClick}
      variant="contained"
      color="secondary"
      size="medium"
      sx={{ width: "fit-content" }}
    >
      {buttonText}
    </Button>
  </Box>
)
