"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  Box,
  Divider,
  Fab,
  Grow,
  Paper,
  Popper,
  SvgIcon,
  Typography,
} from "@mui/material"
import Image from "next/image"
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
import WildcatEyes from "@/assets/pictures/eyes.webp"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"

import {
  FabButtonSx,
  ItemChevronSx,
  ItemIconWrapperSx,
  ItemTypoContainerSx,
  MenuItemSx,
  DisabledMenuItemSx,
  ModalHeaderSx,
  OverlaySx,
  PopperPaperSx,
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

function HelpMenuItem({
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

export const HelpModal = () => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const popperContentRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const handleToggle = () => setOpen((prev) => !prev)
  const handleClose = useCallback(() => {
    setOpen(false)
    // Return focus to the FAB trigger on close
    anchorRef.current?.focus()
  }, [])

  // Escape key handler (H5)
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        handleClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, handleClose])

  // Focus management: move focus into popper when it opens (H6)
  useEffect(() => {
    if (!open) return undefined

    // Slight delay to allow the Grow transition to render the content
    const timer = setTimeout(() => {
      const firstLink =
        popperContentRef.current?.querySelector<HTMLElement>("a, [role=link]")
      firstLink?.focus()
    }, 220)

    return () => clearTimeout(timer)
  }, [open])

  return (
    <>
      <Fab
        ref={anchorRef}
        onClick={handleToggle}
        sx={{
          ...FabButtonSx,
          display: { xs: "none", md: "flex" },
        }}
        aria-label={t("helpModal.ariaLabel")}
        aria-expanded={open}
        aria-haspopup="true"
        disableRipple
      >
        {open ? (
          <SvgIcon
            aria-hidden="true"
            sx={{ path: { fill: COLORS.white }, fontSize: "20px" }}
          >
            <Cross />
          </SvgIcon>
        ) : (
          <Typography variant="text1" color={COLORS.white}>
            ?
          </Typography>
        )}
      </Fab>

      {/* Backdrop overlay (L2: replaces ClickAwayListener) */}
      <Box
        onClick={handleClose}
        role="presentation"
        aria-hidden="true"
        sx={OverlaySx(open)}
      />

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
            <Paper
              sx={PopperPaperSx}
              elevation={0}
              role="dialog"
              aria-label={t("helpModal.title")}
            >
              <Box ref={popperContentRef}>
                <Box
                  sx={{
                    ...ModalHeaderSx,
                    alignItems: "center",
                  }}
                >
                  <Image
                    src={WildcatEyes}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: "120px",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </Box>

                <Box
                  component={Link}
                  href={EXTERNAL_LINKS.TELEGRAM_BOT}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={TelegramItemSx}
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
                      sx={{
                        opacity: 0.8,
                      }}
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
              </Box>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}
