import * as React from "react"

import { Button, Menu, MenuItem, Typography } from "@mui/material"

import { MarketExportModal } from "@/components/ExportModal/MarketExportModal"
import { isMarketExportSupported } from "@/utils/marketExport"

import { MarketMoreMenuProps } from "./interface"
import { MenuPaperSx, MoreButtonSx, MoreButtonTextSx } from "./style"

export const MarketMoreMenu = ({ market }: MarketMoreMenuProps) => {
  const buttonId = React.useId()
  const menuId = React.useId()

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const isMenuOpen = Boolean(anchorEl)

  if (!isMarketExportSupported(market)) return null

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
        <MenuItem onClick={handleOpenExport}>
          <Typography variant="text3">Export Market Info</Typography>
        </MenuItem>
      </Menu>

      <MarketExportModal
        market={market}
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </>
  )
}
