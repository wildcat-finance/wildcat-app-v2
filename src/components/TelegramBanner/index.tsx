"use client"

import { useEffect, useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import TelegramFlyIcon from "@/assets/icons/telegramFly_icon.svg"
import BannerBg from "@/assets/pictures/telegram_banner_bg.svg"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const STORAGE_KEY = "tg_banner_first_visit"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const TelegramBanner = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  // Initialize as true to avoid CLS (banner reserves space on first paint)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)

      if (!stored) {
        localStorage.setItem(STORAGE_KEY, String(Date.now()))
        setVisible(true)
        return
      }

      const timestamp = Number(stored)
      if (Number.isNaN(timestamp)) {
        // Corrupted value: reset and show
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(STORAGE_KEY, String(Date.now()))
        setVisible(true)
        return
      }

      const elapsed = Date.now() - timestamp
      setVisible(elapsed < SEVEN_DAYS_MS)
    } catch {
      // localStorage unavailable (e.g. private browsing in some browsers)
      setVisible(true)
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
      component="aside"
      aria-label={t("telegramBanner.title")}
      sx={{
        mb: "10px",
        mx: "auto",
        width: "232px",
        height: "218px",
        boxSizing: "border-box",
        borderRadius: "20px",
        overflow: "hidden",
        position: "relative",
        isolation: "isolate",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "22px",
      }}
    >
      <BannerBg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
        }}
      />

      <SvgIcon
        aria-hidden="true"
        sx={{
          fontSize: "36px",
          "& path": { fill: COLORS.white },
        }}
      >
        <TelegramFlyIcon />
      </SvgIcon>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <Typography variant="text2" textAlign="center" color={COLORS.white}>
          {t("telegramBanner.title")}
        </Typography>

        <Typography
          variant="text4"
          textAlign="center"
          color={COLORS.white}
          sx={{ opacity: 0.8 }}
        >
          {t("telegramBanner.subtitle")}
        </Typography>
      </Box>

      <Button
        component={Link}
        href={EXTERNAL_LINKS.TELEGRAM_BOT}
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
