"use client"

import { useEffect, useState } from "react"

import { Box, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import TelegramSendIcon from "@/assets/icons/telegramSend_icon.svg"
import BannerBg from "@/assets/pictures/telegramPillBanner_bg.svg"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { isServiceAgreementPath } from "@/utils/serviceAgreementParty"

const STORAGE_KEY = "tg_banner_first_visit"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const TelegramBanner = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const [visible, setVisible] = useState(false)

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
    isServiceAgreementPath(pathname)

  if (hideBanner) return null

  return (
    <Box
      component="aside"
      aria-label={t("header.telegramBanner.compact")}
      sx={{
        mx: "auto",
        width: "232px",
      }}
    >
      <Box
        component={Link}
        href={EXTERNAL_LINKS.TELEGRAM_BOT}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          width: "100%",
          height: "40px",
          boxSizing: "border-box",
          borderRadius: "10px",
          bgcolor: COLORS.bunker,
          overflow: "hidden",
          position: "relative",
          isolation: "isolate",
          padding: "6px 6px 6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          textDecoration: "none",

          "&:hover .TelegramBanner-action": { bgcolor: COLORS.white03 },
        }}
      >
        <BannerBg
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-124px",
            top: "-460px",
            width: "755px",
            height: "646px",
            zIndex: -1,
          }}
        />

        <Box sx={{ display: "flex", flex: "1 0 0", minWidth: 0 }}>
          <Typography
            variant="text4Highlighted"
            color={COLORS.white}
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("header.telegramBanner.compact")}
          </Typography>
        </Box>

        <Box
          className="TelegramBanner-action"
          aria-hidden="true"
          sx={{
            flexShrink: 0,
            width: "28px",
            height: "28px",
            borderRadius: "20px",
            bgcolor: COLORS.white02,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transition: "background-color 0.2s",

            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              padding: "1px",
              background:
                "linear-gradient(334deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.6))",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            },
          }}
        >
          <TelegramSendIcon />
        </Box>
      </Box>
    </Box>
  )
}
