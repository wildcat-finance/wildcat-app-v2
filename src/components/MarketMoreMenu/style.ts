import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const MoreButtonSx = (isOpen: boolean): SxProps<Theme> => ({
  width: "28px",
  minWidth: "28px",
  height: "28px",
  padding: 0,
  borderRadius: "50%",
  flexShrink: 0,
  ...(isOpen && { background: COLORS.blackRock03 }),
})

// The ellipsis sits on the text baseline; lift it to the optical centre.
export const MoreButtonTextSx: SxProps<Theme> = {
  position: "relative",
  bottom: "3px",
}

export const MenuPaperSx: SxProps<Theme> = {
  marginTop: "4px",
}

// Pull the leading icon in so its glyph lines up with the text of the items
// above.
export const TelegramMenuItemSx: SxProps<Theme> = {
  gap: "2px",
  paddingLeft: "8px",
}

export const TelegramIconSx: SxProps<Theme> = {
  fontSize: "20px",
  flexShrink: 0,
  "& path": { fill: COLORS.ultramarineBlue },
}
