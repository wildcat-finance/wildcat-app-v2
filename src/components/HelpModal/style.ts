import { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export const FabButtonSx: SxProps<Theme> = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  width: "44px",
  height: "44px",
  minHeight: "44px",
  bgcolor: COLORS.blueRibbon,
  color: COLORS.white,
  boxShadow: "0px 4px 16px rgba(73, 113, 255, 0.4)",
  zIndex: 1250,
  "&:hover": {
    bgcolor: COLORS.ultramarineBlue,
    boxShadow: "0px 6px 20px rgba(73, 113, 255, 0.5)",
  },
  transition: "background-color 0.2s ease, box-shadow 0.2s ease",
}

export const OverlaySx = (open: boolean): SxProps<Theme> => ({
  position: "fixed",
  inset: 0,
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  bgcolor: "rgba(20, 20, 20, 0.35)",
  zIndex: 1248,
  visibility: open ? "visible" : "hidden",
  pointerEvents: open ? "auto" : "none",
})

export const PopperPaperSx: SxProps<Theme> = {
  minWidth: "0px !important",
  width: "350px",
  borderRadius: "12px",
  border: `1px solid ${COLORS.whiteLilac}`,
  boxShadow:
    "84px 56px 28px 0px rgba(92,92,92,0), 55px 37px 27px 0px rgba(92,92,92,0.01), 3px 3px 9px 0px rgba(92,92,92,0.05)",
  bgcolor: COLORS.white,
  overflow: "hidden",
  p: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const ModalHeaderSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "26px",
}

export const TelegramItemSx: SxProps<Theme> = {
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  borderRadius: "14px",
  padding: "10px 12px",
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  cursor: "pointer",
  textDecoration: "none",
  transition: "opacity 0.15s ease",
  "&:hover": {
    opacity: 0.9,
  },
}

export const TelegramIconSx: SxProps<Theme> = {
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
  bgcolor: "rgba(255, 255, 255, 0.20)",
  border: "0.714px solid rgba(255, 255, 255, 0)",
  padding: "4px 5px",
}

export const MenuItemSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  cursor: "pointer",
  textDecoration: "none",
  borderRadius: "8px",
  padding: "4px 0",
  transition: "opacity 0.15s ease",
  "&:hover": {
    opacity: 0.8,
  },
}

export const DisabledMenuItemSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  borderRadius: "8px",
  padding: "4px 0",
  opacity: 0.45,
  cursor: "default",
  pointerEvents: "none",
}

export const ItemIconWrapperSx: SxProps<Theme> = {
  width: "20px",
  height: "20px",
  bgcolor: COLORS.blackHaze,
  borderRadius: "6px",
}

export const ItemTypoContainerSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
}

export const ItemChevronSx: SxProps<Theme> = {
  transform: "rotate(-180deg)",
  fontSize: "16px",
  margin: "0 0 auto auto",
  "& path": { fill: COLORS.santasGrey },
}
