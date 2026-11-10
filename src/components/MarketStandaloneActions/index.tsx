import * as React from "react"

import { Box, Button, SvgIcon } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { MarketExportModal } from "@/components/ExportModal/MarketExportModal"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { isMarketExportSupported } from "@/utils/marketExport"

import { MarketStandaloneActionsProps } from "./interface"
import {
  ActionButtonSx,
  StandaloneActionsContainer,
  TelegramButtonSx,
  TelegramIconSx,
} from "./style"

// The "..." menu's actions as standalone buttons, for viewers who don't get the
// market actions row the menu ends (no wallet, no access, wrong network).
export const MarketStandaloneActions = ({
  market,
}: MarketStandaloneActionsProps) => {
  const { t } = useTranslation()
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const supportsExport = isMarketExportSupported(market)

  return (
    <Box sx={StandaloneActionsContainer}>
      {supportsExport && (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={ActionButtonSx}
          onClick={() => setIsExportOpen(true)}
        >
          Export Market Info
        </Button>
      )}

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

      {supportsExport && (
        <MarketExportModal
          market={market}
          open={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </Box>
  )
}
