"use client"

import { useEffect, useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import TelegramFlyIcon from "@/assets/icons/telegramFly_icon.svg"
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
        mx: "16px",
        borderRadius: "20px",
        bgcolor: COLORS.bunker,
        overflow: "hidden",
        position: "relative",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Background image via next/image for optimization */}
      <Image
        src="/images/telegramBigBanner_bg.webp"
        alt=""
        fill
        sizes="241px"
        style={{ objectFit: "cover", objectPosition: "center" }}
        priority={false}
        aria-hidden="true"
      />

      <SvgIcon
        aria-hidden="true"
        sx={{
          fontSize: "36px",
          marginBottom: "8px",
          position: "relative",
          "& path": { fill: COLORS.white },
        }}
      >
        <TelegramFlyIcon />
      </SvgIcon>

      <Typography
        variant="text2"
        textAlign="center"
        color={COLORS.white}
        sx={{ marginBottom: "4px", position: "relative" }}
      >
        {t("telegramBanner.title")}
      </Typography>

      <Typography
        variant="text4"
        textAlign="center"
        color={COLORS.white}
        sx={{ marginBottom: "22px", opacity: 0.8, position: "relative" }}
      >
        {t("telegramBanner.subtitle")}
      </Typography>

      <Button
        component={Link}
        href={EXTERNAL_LINKS.TELEGRAM_BOT}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        size="small"
        sx={{
          position: "relative",
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
