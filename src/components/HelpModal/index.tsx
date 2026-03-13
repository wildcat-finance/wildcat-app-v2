"use client"

import { useRef, useState } from "react"

import {
  Box,
  ClickAwayListener,
  Divider,
  Fab,
  Grow,
  Paper,
  Popper,
  SvgIcon,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Ask from "@/assets/icons/ask_icon.svg"
import Bug from "@/assets/icons/bug_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import Feat from "@/assets/icons/feat_icon.svg"
import Message from "@/assets/icons/message_icon.svg"
import Partnership from "@/assets/icons/partnership_icon.svg"
import Arrow from "@/assets/icons/sharpArrow_icon.svg"
import Telegram from "@/assets/icons/telegram_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import {
  FabButtonSx,
  ItemChevronSx,
  ItemIconWrapperSx,
  ItemTypoContainerSx,
  MenuItemSx,
  ModalHeaderSx,
  OverlaySx,
  PopperPaperSx,
  TelegramIconSx,
  TelegramItemSx,
} from "./style"

const TELEGRAM_URL = "https://t.me/wildcat_notifications_bot"
const BUG_REPORT_URL = ""
const ASK_QUESTION_URL = "https://t.me/+ewyCAZOA5_Y2Zjg0"
const SUGGEST_FEATURE_URL = ""
const FAQ_URL = "https://docs.wildcat.finance/overview/faqs"
const BUSINESS_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfnCu3FjMtA48sWn28oRXxw71dc4ofnfaF1NdNnK62tkFxu7A/viewform?usp=send_form"

type HelpMenuItemProps = {
  icon?: React.ReactNode
  title: string
  subtitle: string
  href: string
  showDivider?: boolean
}

function HelpMenuItem({
  icon,
  title,
  subtitle,
  href,
  showDivider = true,
}: HelpMenuItemProps) {
  return (
    <>
      <Box
        component={Link}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={MenuItemSx}
      >
        <Box sx={ItemIconWrapperSx}>
          <SvgIcon sx={{ fontSize: "20px", "& path": COLORS.santasGrey }}>
            {icon}
          </SvgIcon>
        </Box>

        <Box sx={ItemTypoContainerSx}>
          <Typography variant="text3">{title}</Typography>
          <Typography variant="text3" color={COLORS.manate}>
            {subtitle}
          </Typography>
        </Box>

        <SvgIcon sx={ItemChevronSx}>
          <Arrow />
        </SvgIcon>
      </Box>

      {showDivider && (
        <Divider sx={{ borderColor: COLORS.whiteLilac, my: "4px" }} />
      )}
    </>
  )
}

export const HelpModal = () => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  const handleToggle = () => setOpen((prev) => !prev)
  const handleClose = () => setOpen(false)

  if (isMobile) return null

  return (
    <>
      <Fab
        ref={anchorRef}
        onClick={handleToggle}
        sx={FabButtonSx}
        aria-label="Help and feedback"
        disableRipple
      >
        {open ? (
          <SvgIcon sx={{ path: { fill: COLORS.white }, fontSize: "20px" }}>
            <Cross />
          </SvgIcon>
        ) : (
          <Typography variant="text1" color={COLORS.white}>
            ?
          </Typography>
        )}
      </Fab>

      <Box onClick={handleClose} sx={OverlaySx(open)} />

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="top-end"
        transition
        disablePortal={false}
        style={{ zIndex: 1299 }}
        modifiers={[
          {
            name: "offset",
            options: { offset: [0, 12] },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} timeout={200}>
            <Paper sx={PopperPaperSx} elevation={0}>
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  <Box sx={ModalHeaderSx}>
                    <Typography variant="text1">
                      {t("helpModal.title")}
                    </Typography>
                    <Typography variant="text3" color={COLORS.manate}>
                      {t("helpModal.subtitle")}
                    </Typography>
                  </Box>

                  <Box
                    component={Link}
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={TelegramItemSx}
                  >
                    <Box sx={TelegramIconSx}>
                      <SvgIcon
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
                        sx={{
                          opacity: 0.8,
                        }}
                      >
                        {t("helpModal.items.telegram.subtitle")}
                      </Typography>
                    </Box>

                    <SvgIcon
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

                  {/* Regular items */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      pt: "8px",
                    }}
                  >
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
                      href={ASK_QUESTION_URL}
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
                      href={FAQ_URL}
                    />
                    <HelpMenuItem
                      icon={<Partnership />}
                      title={t("helpModal.items.business.title")}
                      subtitle={t("helpModal.items.business.subtitle")}
                      href={BUSINESS_URL}
                      showDivider={false}
                    />
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}
