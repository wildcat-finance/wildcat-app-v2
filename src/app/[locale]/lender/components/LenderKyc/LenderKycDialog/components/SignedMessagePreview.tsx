import { useId } from "react"

import { Box, ButtonBase, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { COLORS } from "@/theme/colors"

import {
  DisclosureButtonSx,
  MESSAGE_PANEL_TRANSITION,
  MessageContentSx,
  MessagePanelSx,
  MessageSpacerSx,
  MessageTextSx,
} from "../style"

type SignedMessagePreviewProps = {
  message: string
  isOpen: boolean
  onToggle: () => void
  onTransitionEnd?: () => void
}

export const SignedMessagePreview = ({
  message,
  isOpen,
  onToggle,
  onTransitionEnd,
}: SignedMessagePreviewProps) => {
  const { t } = useTranslation()
  const contentId = useId()

  return (
    <>
      <Box sx={MessageSpacerSx} />
      <Box
        sx={MessagePanelSx(isOpen)}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) onTransitionEnd?.()
        }}
      >
        <ButtonBase
          disableRipple
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
          sx={DisclosureButtonSx}
        >
          <SvgIcon
            fontSize="small"
            sx={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: `transform ${MESSAGE_PANEL_TRANSITION}`,
            }}
          >
            <UpArrow />
          </SvgIcon>
          <Typography variant="text3Highlighted" color="inherit">
            {isOpen
              ? t("lenderKyc.modal.hideMessage")
              : t("lenderKyc.modal.showMessage")}
          </Typography>
        </ButtonBase>
        <Box id={contentId} aria-hidden={!isOpen} sx={MessageContentSx(isOpen)}>
          <Typography variant="text4" component="p" color={COLORS.blackRock}>
            <Box component="span" sx={MessageTextSx}>
              {message}
            </Box>
          </Typography>
        </Box>
      </Box>
    </>
  )
}
