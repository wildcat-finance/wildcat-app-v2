"use client"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Background from "@/assets/pictures/overviewBG.webp"
import { SideAppHeader } from "@/components/SideAppHeader"
import { COLORS } from "@/theme/colors"

export default function AirdropLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Box sx={{ height: "-webkit-fill-available" }}>
      <Box
        sx={{
          top: 0,
          left: 0,
          width: "100%",
          height: "100vh",
          position: "fixed",
          backgroundImage: `url(${Background.src})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",

          zIndex: "-1",
        }}
      />
      <SideAppHeader theme="dark" />
      {children}
      <Typography
        sx={{
          display: { xs: "block", md: "none" },
          textAlign: "center",
          pb: "10px",
        }}
        variant="text4"
        color={COLORS.white06}
      >
        {t("footer.rights")}
      </Typography>
    </Box>
  )
}
