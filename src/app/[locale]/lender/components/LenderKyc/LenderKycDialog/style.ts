import { COLORS } from "@/theme/colors"

export const DesktopDialogSx = {
  "& .MuiDialog-paper": {
    width: "895px",
    maxWidth: "min(895px, calc(100% - 32px))",
    maxHeight: "calc(100dvh - 64px)",
    minWidth: "0 !important",
    border: "none",
    borderRadius: "20px",
    margin: 0,
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflow: "hidden",
  },
}

export const MobileDialogSx = {
  marginTop: "auto",
  zIndex: 9999,

  "& .MuiPaper-root.MuiDialog-paper": {
    margin: "auto 4px 4px",
    maxWidth: "100%",
    width: "100%",
    minWidth: "0 !important",
    maxHeight: "calc(100dvh - 8px)",
    padding: "24px 0 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflow: "hidden",
  },
  "& .MuiBackdrop-root": {
    marginTop: "auto",
    backgroundColor: "transparent",
    backdropFilter: "blur(20px)",
  },
}

export const MobileTitleRowSx = {
  paddingX: "12px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
}

export const MobileCloseIconSx = {
  fontSize: "20px",
  "& path": { fill: COLORS.greySuit },
}

export const ROW_HEIGHT = 40

export const LoadingSkeletonSx = {
  width: "100%",
  maxWidth: "none",
  borderRadius: "12px",
  bgcolor: COLORS.athensGrey,
}

export const SectionPaddingSx = { paddingX: { xs: "12px", md: "24px" } }

export const HeaderSx = {
  ...SectionPaddingSx,
  flexShrink: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
}

export const BodySx = (isMessageOpen: boolean) => ({
  ...SectionPaddingSx,
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: isMessageOpen ? "hidden" : "auto",
  display: "flex",
  flexDirection: "column",
})

export const BodyInnerSx = (lockedHeight: number | null) => ({
  position: "relative",
  flex: "1 0 auto",
  height: lockedHeight === null ? "auto" : `${lockedHeight}px`,
  overflow: lockedHeight === null ? "visible" : "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
})

export const MESSAGE_PANEL_TRANSITION = "0.35s cubic-bezier(0.4, 0, 0.2, 1)"

export const ContentLayerSx = (isMessageOpen: boolean) => ({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  opacity: isMessageOpen ? 0 : 1,
  visibility: isMessageOpen ? "hidden" : "visible",
  transition: isMessageOpen
    ? `opacity ${MESSAGE_PANEL_TRANSITION}, visibility 0s linear 0.35s`
    : `opacity ${MESSAGE_PANEL_TRANSITION}, visibility 0s`,
})

export const FooterSx = {
  ...SectionPaddingSx,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
}

export const WalletRowSx = {
  flexShrink: 0,
  height: `${ROW_HEIGHT}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "0 12px",
  borderRadius: "12px",
  backgroundColor: COLORS.whiteSmoke,
}

export const FieldsGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" },
  gap: "12px",
}

export const FieldLabelSx = {
  color: COLORS.santasGrey,
  padding: "0 4px",
  marginBottom: "4px",
}

export const LenderTypeSelectSx = (readOnly: boolean) => ({
  "&.MuiInputBase-root": {
    height: "44px",
    ...(readOnly && {
      backgroundColor: COLORS.whiteSmoke,
      borderColor: "transparent",
      "&:hover, &.Mui-focused": {
        backgroundColor: COLORS.whiteSmoke,
        borderColor: "transparent",
      },
    }),
  },
  "& .MuiSelect-select.MuiInputBase-input": {
    height: "20px",
    minHeight: "20px",
    padding: "11px 40px 11px 15px",
    cursor: readOnly ? "default" : "pointer",
  },
  "& .MuiSelect-icon": {
    display: readOnly ? "none" : "block",
  },
})

export const LenderTypePlaceholderSx = {
  color: COLORS.santasGrey,
}

export const LenderTypeMenuSx = (width: number | undefined) => ({
  "data-hj-suppress": true,
  sx: {
    zIndex: 10000,
    "& .MuiPaper-root": {
      minWidth: "0 !important",
      width: width ? `${width}px` : "auto",
      maxWidth: "calc(100vw - 16px)",
    },
  },
  anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
  transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
})

export const LenderTypeMenuItemSx = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  whiteSpace: "normal",
  "&.Mui-selected": {
    color: COLORS.blackRock,
    background: "transparent",
    "&:hover": { background: COLORS.hintOfRed },
    "&.Mui-focusVisible": { background: COLORS.hintOfRed },
  },
}

export const TermsLabelSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "2px 4px",
  cursor: "pointer",
}

export const MessageSpacerSx = {
  flexShrink: 0,
  height: `${ROW_HEIGHT}px`,
}

export const MessagePanelSx = (isOpen: boolean) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  height: isOpen ? "100%" : `${ROW_HEIGHT}px`,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backgroundColor: COLORS.white,
  overflow: "hidden",
  transition: `height ${MESSAGE_PANEL_TRANSITION}`,
})

export const MessageContentSx = (isOpen: boolean) => ({
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  padding: "12px",
  borderRadius: "12px",
  backgroundColor: COLORS.whiteSmoke,
  opacity: isOpen ? 1 : 0,
  transition: `opacity ${MESSAGE_PANEL_TRANSITION}`,
})

export const MessageTextSx = {
  whiteSpace: "pre-line",
  overflowWrap: "anywhere",
}

export const ContinueIconSx = {
  fontSize: "16px",
  "& path[fill]": { fill: "currentColor" },
  "& path[stroke]": { stroke: "currentColor" },
}

export const TextFieldSx = {
  height: "auto",
  position: "relative",
  "& .MuiFormHelperText-root": {
    position: { md: "absolute" },
    top: { md: "100%" },
    left: { md: 0 },
    right: { md: 0 },
    whiteSpace: { md: "nowrap" },
    overflow: { md: "hidden" },
    textOverflow: { md: "ellipsis" },
  },
}

export const ReadOnlyFieldSx = {
  ...TextFieldSx,
  "& .MuiInputBase-root, & .MuiInputBase-root:hover, & .MuiInputBase-root.Mui-focused":
    {
      backgroundColor: COLORS.whiteSmoke,
      borderColor: "transparent",
    },
}

export const DisclosureButtonSx = {
  flexShrink: 0,
  width: "100%",
  height: `${ROW_HEIGHT}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "8px",
  padding: "0 12px",
  borderRadius: "12px",
  backgroundColor: COLORS.whiteSmoke,
  transition: "background-color 0.15s ease-in-out",
  "&:hover": { backgroundColor: COLORS.athensGrey },
  color: COLORS.bunker,
  fontFamily: "inherit",
  textAlign: "left",
  "& .MuiSvgIcon-root path": { fill: "currentColor" },
}

export const PrimaryButtonSx = {
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
}
