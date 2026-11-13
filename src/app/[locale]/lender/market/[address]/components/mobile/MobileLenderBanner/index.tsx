import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"

export type MobileLenderBannerProps = {
  title: string
  subtitle: string
  buttonText: string
  href?: string
  onButtonClick?: () => void
  tone?: "brand" | "neutral"
}

export const MobileLenderBanner = ({
  title,
  subtitle,
  buttonText,
  href,
  onButtonClick,
  tone = "brand",
}: MobileLenderBannerProps) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      position: "sticky",
      bottom: "4px",
      width: "calc(100vw - 8px)",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        backgroundColor: tone === "neutral" ? COLORS.whiteSmoke : COLORS.bunker,
        borderRadius: "14px",
        width: "100%",
      }}
    >
      <Typography
        variant="mobH3"
        color={tone === "neutral" ? COLORS.bunker : COLORS.white}
        textAlign="center"
        marginTop="4px"
      >
        {title}
      </Typography>

      <Typography
        variant="mobText3"
        textAlign="center"
        color={tone === "neutral" ? COLORS.manate : COLORS.white06}
        marginTop="4px"
      >
        {subtitle}
      </Typography>

      <Button
        {...(href ? { component: Link, href } : {})}
        variant="contained"
        color={tone === "neutral" ? "primary" : "secondary"}
        size="medium"
        sx={{ mt: "12px" }}
        onClick={onButtonClick}
      >
        {buttonText}
      </Button>
    </Box>
  </Box>
)
