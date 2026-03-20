"use client"

import { Box, Divider, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Ask from "@/assets/icons/ask_icon.svg"
import Bug from "@/assets/icons/bug_icon.svg"
import Feat from "@/assets/icons/feat_icon.svg"
import Message from "@/assets/icons/message_icon.svg"
import Partnership from "@/assets/icons/partnership_icon.svg"
import Arrow from "@/assets/icons/sharpArrow_icon.svg"
import Telegram from "@/assets/icons/telegram_icon.svg"
import telegramSmallBg from "@/assets/pictures/telegramSmallBanner_bg.svg?url"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"

import {
  DisabledMenuItemSx,
  ItemChevronSx,
  ItemIconWrapperSx,
  ItemTypoContainerSx,
  MenuItemSx,
  TelegramIconSx,
  TelegramItemSx,
} from "./style"

// Empty strings indicate URLs that are not yet configured
const BUG_REPORT_URL = ""
const SUGGEST_FEATURE_URL = ""

type HelpMenuItemProps = {
  icon?: React.ReactNode
  title: string
  subtitle: string
  href: string
  showDivider?: boolean
}

export function HelpMenuItem({
  icon,
  title,
  subtitle,
  href,
  showDivider = true,
}: HelpMenuItemProps) {
  const isDisabled = !href

  const content = (
    <>
      <Box sx={ItemIconWrapperSx}>
        <SvgIcon
          aria-hidden="true"
          sx={{ fontSize: "20px", "& path": { fill: COLORS.santasGrey } }}
        >
          {icon}
        </SvgIcon>
      </Box>

      <Box sx={ItemTypoContainerSx}>
        <Typography variant="text3">{title}</Typography>
        <Typography variant="text3" color={COLORS.manate}>
          {subtitle}
        </Typography>
      </Box>

      <SvgIcon aria-hidden="true" sx={ItemChevronSx}>
        <Arrow />
      </SvgIcon>
    </>
  )

  return (
    <>
      {isDisabled ? (
        <Box
          sx={DisabledMenuItemSx}
          aria-disabled="true"
          role="link"
          tabIndex={-1}
        >
          {content}
        </Box>
      ) : (
        <Box
          component={Link}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={MenuItemSx}
        >
          {content}
        </Box>
      )}

      {showDivider && (
        <Divider sx={{ borderColor: COLORS.whiteLilac, my: "4px" }} />
      )}
    </>
  )
}

export function TelegramHelpItem() {
  const { t } = useTranslation()

  return (
    <Box
      component={Link}
      href={EXTERNAL_LINKS.TELEGRAM_BOT}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        ...TelegramItemSx,
        backgroundImage: `url(${telegramSmallBg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Box sx={TelegramIconSx}>
        <SvgIcon
          aria-hidden="true"
          sx={{
            fontSize: "20px",
            "& path": { fill: COLORS.white },
          }}
        >
          <Telegram />
        </SvgIcon>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <Typography variant="text3" color={COLORS.white}>
          {t("helpModal.items.telegram.title")}
        </Typography>
        <Typography
          variant="text3"
          color={COLORS.white}
          sx={{ opacity: 0.8 }}
        >
          {t("helpModal.items.telegram.subtitle")}
        </Typography>
      </Box>

      <SvgIcon
        aria-hidden="true"
        sx={{
          transform: "rotate(-180deg)",
          fontSize: "16px",
          margin: "0 0 auto auto",
          "& path": { fill: COLORS.white04 },
        }}
      >
        <Arrow />
      </SvgIcon>
    </Box>
  )
}

export function HelpMenuItemsList() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: "flex", flexDirection: "column", pt: "8px" }}>
      <HelpMenuItem
        icon={<Bug />}
        title={t("helpModal.items.bug.title")}
        subtitle={t("helpModal.items.bug.subtitle")}
        href={BUG_REPORT_URL}
      />
      <HelpMenuItem
        icon={<Message />}
        title={t("helpModal.items.question.title")}
        subtitle={t("helpModal.items.question.subtitle")}
        href={EXTERNAL_LINKS.TELEGRAM_COMMUNITY}
      />
      <HelpMenuItem
        icon={<Feat />}
        title={t("helpModal.items.feature.title")}
        subtitle={t("helpModal.items.feature.subtitle")}
        href={SUGGEST_FEATURE_URL}
      />
      <HelpMenuItem
        icon={<Ask />}
        title={t("helpModal.items.faq.title")}
        subtitle={t("helpModal.items.faq.subtitle")}
        href={EXTERNAL_LINKS.FAQ}
      />
      <HelpMenuItem
        icon={<Partnership />}
        title={t("helpModal.items.business.title")}
        subtitle={t("helpModal.items.business.subtitle")}
        href={EXTERNAL_LINKS.BUSINESS_INQUIRY}
        showDivider={false}
      />
    </Box>
  )
}
