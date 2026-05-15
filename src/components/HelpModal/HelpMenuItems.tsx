"use client"

import { Box, Divider, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Ask from "@/assets/icons/ask_icon.svg"
import Message from "@/assets/icons/message_icon.svg"
import Partnership from "@/assets/icons/partnership_icon.svg"
import Arrow from "@/assets/icons/sharpArrow_icon.svg"
import Telegram from "@/assets/icons/telegram_icon.svg"
import telegramSmallBg from "@/assets/pictures/telegramSmallBanner_bg.svg?url"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
  isMobile?: boolean
}

export function HelpMenuItem({
  icon,
  title,
  subtitle,
  href,
  showDivider = true,
  isMobile,
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
        <Typography variant={isMobile ? "mobText3" : "text3"}>
          {title}
        </Typography>
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.manate}
        >
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
          component="a"
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

export function TelegramHelpItem({ isMobile }: { isMobile?: boolean }) {
  const { t } = useTranslation()

  return (
    <Box
      component="a"
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
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.white}
        >
          {t("modals.shared.help.telegram.title")}
        </Typography>
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.white}
          sx={{ opacity: 0.8 }}
        >
          {t("modals.shared.help.telegram.subtitle")}
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
  const isMobile = useMobileResolution()

  return (
    <Box sx={{ display: "flex", flexDirection: "column", pt: "8px" }}>
      {/* --- Temporary hidden --- */}
      {/* <HelpMenuItem */}
      {/*  icon={<Bug />} */}
      {/*  title={t("modals.shared.help.bug.title")} */}
      {/*  subtitle={t("modals.shared.help.bug.subtitle")} */}
      {/*  href={BUG_REPORT_URL} */}
      {/* /> */}
      <HelpMenuItem
        icon={<Message />}
        title={t("modals.shared.help.question.title")}
        subtitle={t("modals.shared.help.question.subtitle")}
        href={EXTERNAL_LINKS.TELEGRAM_COMMUNITY}
        isMobile={isMobile}
      />
      {/* --- Temporary hidden --- */}
      {/* <HelpMenuItem */}
      {/*  icon={<Feat />} */}
      {/*  title={t("modals.shared.help.feature.title")} */}
      {/*  subtitle={t("modals.shared.help.feature.subtitle")} */}
      {/*  href={SUGGEST_FEATURE_URL} */}
      {/* /> */}
      <HelpMenuItem
        icon={<Ask />}
        title={t("modals.shared.help.faq.title")}
        subtitle={t("modals.shared.help.faq.subtitle")}
        href={EXTERNAL_LINKS.FAQ}
        isMobile={isMobile}
      />
      <HelpMenuItem
        icon={<Partnership />}
        title={t("modals.shared.help.business.title")}
        subtitle={t("modals.shared.help.business.subtitle")}
        href={EXTERNAL_LINKS.BUSINESS_INQUIRY}
        showDivider={false}
        isMobile={isMobile}
      />
    </Box>
  )
}
