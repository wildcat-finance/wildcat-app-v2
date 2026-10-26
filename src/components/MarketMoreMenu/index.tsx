import * as React from "react"

import { Button, Menu, MenuItem, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { MarketExportModal } from "@/components/ExportModal/MarketExportModal"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"
import { isMarketExportSupported } from "@/utils/marketExport"

import { MarketMoreMenuProps } from "./interface"
import {
  MenuPaperSx,
  MoreButtonSx,
  MoreButtonTextSx,
  TelegramIconSx,
  TelegramMenuItemSx,
} from "./style"

export const MarketMoreMenu = ({ market }: MarketMoreMenuProps) => {
  const { t } = useTranslation()
  const buttonId = React.useId()
  const menuId = React.useId()

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const isMenuOpen = Boolean(anchorEl)
  const supportsExport = isMarketExportSupported(market)

  const handleCloseMenu = () => setAnchorEl(null)

  const handleOpenExport = () => {
    handleCloseMenu()
    setIsExportOpen(true)
  }

  return (
    <>
      <Button
        id={buttonId}
        variant="outlined"
        color="secondary"
        size="small"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-controls={isMenuOpen ? menuId : undefined}
        aria-expanded={isMenuOpen ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={MoreButtonSx(isMenuOpen)}
      >
        <Typography variant="text4" sx={MoreButtonTextSx}>
          …
        </Typography>
      </Button>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        disableScrollLock
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        MenuListProps={{ "aria-labelledby": buttonId }}
        slotProps={{ paper: { sx: MenuPaperSx } }}
      >
        {supportsExport && (
          <MenuItem onClick={handleOpenExport}>
            <Typography variant="text3">Export Market Info</Typography>
          </MenuItem>
        )}

        <MenuItem
          component={Link}
          href={EXTERNAL_LINKS.TELEGRAM_BOT}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCloseMenu}
          sx={TelegramMenuItemSx}
        >
          <SvgIcon aria-hidden="true" sx={TelegramIconSx}>
            <TelegramIcon />
          </SvgIcon>
          <Typography variant="text3" color={COLORS.ultramarineBlue}>
            {t("helpModal.items.telegram.botButton")}
          </Typography>
        </MenuItem>
      </Menu>

      {supportsExport && (
        <MarketExportModal
          market={market}
          open={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </>
  )
}
