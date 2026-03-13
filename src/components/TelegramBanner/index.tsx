"use client"

import { useEffect, useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import TelegramFlyIcon from "@/assets/icons/telegramFly_icon.svg"
import TelegramBigBg from "@/assets/pictures/telegramBigBanner_bg.webp"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const TELEGRAM_URL = "https://t.me/wildcat_notifications_bot"
const STORAGE_KEY = "tg_banner_first_visit"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const TelegramBanner = () => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
      setVisible(true)
    } else {
      const elapsed = Date.now() - Number(stored)
      setVisible(elapsed < SEVEN_DAYS_MS)
    }
  }, [])

  const hideBanner =
    !visible ||
    pathname.includes(ROUTES.lender.market) ||
    pathname.includes(ROUTES.borrower.market) ||
    pathname.includes(ROUTES.agreement)

  if (hideBanner) return null

  return (
    <Box
      sx={{
        mb: "10px",
        mx: "16px",
        borderRadius: "20px",
        bgcolor: COLORS.bunker,
        backgroundImage: `url(${TelegramBigBg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <SvgIcon
        sx={{
          fontSize: "36px",
          marginBottom: "8px",
          "& path": { fill: COLORS.white },
        }}
      >
        <TelegramFlyIcon />
      </SvgIcon>

      <Typography
        variant="text2"
        textAlign="center"
        color={COLORS.white}
        sx={{ marginBottom: "4px" }}
      >
        {t("telegramBanner.title")}
      </Typography>

      <Typography
        variant="text4"
        textAlign="center"
        color={COLORS.white}
        sx={{ marginBottom: "22px", opacity: 0.8 }}
      >
        {t("telegramBanner.subtitle")}
      </Typography>

      <Button
        component={Link}
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        size="small"
        sx={{
          bgcolor: COLORS.white,
          color: COLORS.bunker,
          fontWeight: 600,
          fontSize: "12px",
          borderRadius: "20px",
          px: "16px",
          py: "6px",
          "&:hover": {
            bgcolor: COLORS.whiteLilac,
          },
        }}
      >
        {t("telegramBanner.button")}
      </Button>
    </Box>
  )
}
