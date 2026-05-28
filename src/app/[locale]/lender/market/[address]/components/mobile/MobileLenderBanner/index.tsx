import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"

export type MobileLenderBannerProps = {
  title: string
  subtitle: string
  buttonText: string
  href?: string
  onButtonClick?: () => void
}

export const MobileLenderBanner = ({
  title,
  subtitle,
  buttonText,
  href,
  onButtonClick,
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
        backgroundColor: COLORS.bunker,
        borderRadius: "14px",
        width: "100%",
      }}
    >
      <Typography
        variant="mobH3"
        color={COLORS.white}
        textAlign="center"
        marginTop="12px"
      >
        {title}
      </Typography>

      <Typography
        variant="mobText3"
        textAlign="center"
        color={COLORS.white06}
        marginTop="8px"
      >
        {subtitle}
      </Typography>

      <Button
        {...(href ? { component: Link, href } : {})}
        variant="contained"
        color="secondary"
        size="large"
        sx={{ mt: "24px" }}
        onClick={onButtonClick}
      >
        {buttonText}
      </Button>
    </Box>
  </Box>
)
