import { Button, SvgIcon } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { EXTERNAL_LINKS } from "@/constants/external-links"

import { TelegramButtonSx, TelegramIconSx } from "./style"

export const MarketTelegramButton = () => {
  const { t } = useTranslation()

  return (
    <Button
      component={Link}
      variant="outlined"
      color="secondary"
      size="small"
      href={EXTERNAL_LINKS.TELEGRAM_BOT}
      target="_blank"
      rel="noopener noreferrer"
      sx={TelegramButtonSx}
    >
      <SvgIcon aria-hidden="true" sx={TelegramIconSx}>
        <TelegramIcon />
      </SvgIcon>
      {t("helpModal.items.telegram.botButton")}
    </Button>
  )
}
