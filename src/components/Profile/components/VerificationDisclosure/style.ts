import type { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type VerificationDisclosureVariant = "desktop" | "market" | "inline"

const NOTE_LAYOUT = {
  desktop: {
    width: "320px",
    right: "clamp(24px, 7vw, 132px)",
  },
  market: {
    width: "280px",
    right: "clamp(52px, 5vw, 104px)",
  },
} as const

const DESKTOP_NOTE_GAP = "36px"

export const BORROWER_PROFILE_VERIFICATION_GUTTER = `calc(${NOTE_LAYOUT.desktop.right} + ${NOTE_LAYOUT.desktop.width} + ${DESKTOP_NOTE_GAP})`

const getVerificationNoteWidth = (variant: VerificationDisclosureVariant) => {
  if (variant === "inline") return "100%"

  return NOTE_LAYOUT[variant].width
}

const getVerificationNoteRightOffset = (
  variant: VerificationDisclosureVariant,
) => {
  if (variant === "inline") return undefined

  return NOTE_LAYOUT[variant].right
}

export const VerificationNoteContainer = (
  variant: VerificationDisclosureVariant,
): SxProps<Theme> => ({
  boxSizing: "border-box",
  width: getVerificationNoteWidth(variant),
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "14px",
  backgroundColor: COLORS.white,
  padding: variant === "inline" ? "20px 22px" : "14px 16px",
  ...(variant !== "inline"
    ? {
        position: "fixed",
        top: "118px",
        right: getVerificationNoteRightOffset(variant),
        zIndex: 1,
        maxHeight: "calc(100vh - 142px)",
        overflowY: "auto",
      }
    : {
        marginTop: "16px",
      }),
})

export const VerificationHeader = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
}

export const VerificationIconBox = (compact?: boolean) => ({
  width: compact ? "28px" : "32px",
  height: compact ? "28px" : "32px",
  minWidth: compact ? "28px" : "32px",
  borderRadius: "10px",
  backgroundColor: COLORS.athensGrey,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})

export const VerificationSectionHeader = (compact?: boolean) => ({
  display: "flex",
  alignItems: "center",
  gap: compact ? "6px" : "8px",
  marginBottom: compact ? "6px" : "10px",
})

export const VerificationList = (compact?: boolean) => ({
  margin: 0,
  paddingLeft: "16px",
  display: "flex",
  flexDirection: "column",
  gap: compact ? "5px" : "8px",
})

export const VerificationModalDialog = {
  "& .MuiPaper-root.MuiDialog-paper": {
    boxSizing: "border-box",
    width: "520px",
    minWidth: "0 !important",
    maxWidth: "calc(100vw - 32px)",
    borderRadius: "20px",
    border: "none",
    margin: 0,
    padding: "32px",
  },
}

export const VerificationModalLists = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "minmax(0, 1fr) minmax(0, 1fr)",
  },
  gap: "12px",
}

export const VerificationModalFieldGroup = {
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "12px",
  backgroundColor: COLORS.alabaster,
  padding: "16px",
  minWidth: 0,
}
