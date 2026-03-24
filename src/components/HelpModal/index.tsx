"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  Box,
  Fab,
  Grow,
  Paper,
  Popper,
  SvgIcon,
  Typography,
} from "@mui/material"
import Image from "next/image"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import WildcatEyes from "@/assets/pictures/eyes.webp"
import { COLORS } from "@/theme/colors"

import { HelpMenuItemsList, TelegramHelpItem } from "./HelpMenuItems"
import { FabButtonSx, ModalHeaderSx, OverlaySx, PopperPaperSx } from "./style"

export const HelpModal = () => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()

  const handleToggle = () => setOpen((prev) => !prev)
  const handleClose = useCallback(() => {
    setOpen(false)
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
              <Box>
                <Box sx={ModalHeaderSx}>
                  <Typography variant="text1">
                    {t("helpModal.title")}
                  </Typography>
                  <Typography variant="text3" color={COLORS.manate}>
                    {t("helpModal.subtitle")}
                  </Typography>
                </Box>

                <TelegramHelpItem />
                <HelpMenuItemsList />
              </Box>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}
