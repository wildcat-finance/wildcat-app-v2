import type { SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type VerificationDisclosureVariant = "desktop" | "market" | "inline"

const NOTE_LAYOUT = {
  desktop: {
    width: "320px",
  },
  market: {
    width: "280px",
    right: "clamp(52px, 5vw, 104px)",
  },
} as const

const DESKTOP_NOTE_GAP = "36px"

export const BORROWER_PROFILE_VERIFICATION_COLUMN = {
  width: NOTE_LAYOUT.desktop.width,
  gap: DESKTOP_NOTE_GAP,
} as const

const getVerificationNoteWidth = (variant: VerificationDisclosureVariant) => {
  if (variant === "inline") return "100%"

  return NOTE_LAYOUT[variant].width
}

export const VerificationNoteContainer =
  (variant: VerificationDisclosureVariant): SxProps<Theme> =>
  (theme) => ({
    boxSizing: "border-box",
    width: getVerificationNoteWidth(variant),
    border: `1px solid ${COLORS.iron}`,
    borderRadius: "14px",
    backgroundColor: COLORS.white,
    padding: variant === "inline" ? "20px 22px" : "14px 16px",
    ...(variant !== "inline"
      ? {
          ...(variant === "market" && {
            position: "fixed" as const,
            top: "118px",
            right: NOTE_LAYOUT.market.right,
            zIndex: 1,
          }),
          maxHeight: "calc(100vh - 142px)",
          overflowY: "auto",
          [theme.breakpoints.down(variant === "market" ? "xl" : "lg")]: {
            position: "static",
            width: "100%",
            maxHeight: "none",
            overflowY: "visible",
            marginTop: "24px",
          },
        }
      : {
          marginTop: "16px",
        }),
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
