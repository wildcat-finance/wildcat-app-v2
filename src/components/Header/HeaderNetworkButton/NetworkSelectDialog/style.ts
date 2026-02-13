import { COLORS } from "@/theme/colors"

export const DialogContainer = {
  "& .MuiDialog-paper": {
    width: "320px",
    borderRadius: "12px 12px 12px 16px",
    border: `1px solid ${COLORS.hintOfRed}`,
    boxShadow: "0px 2px 10px 0px rgba(0,0,0,0.05)",
    margin: 0,
    padding: "20px 16px 16px 16px",
  },
}

export const MobileDialogContainer = {
  marginTop: "auto",
  zIndex: 9999,

  "& .MuiPaper-root.MuiDialog-paper": {
    margin: "auto 4px 4px",
    maxWidth: "100%",
    width: "100%",
    padding: "24px 12px 20px",
  },
  "& .MuiBackdrop-root": {
    marginTop: "auto",
    backgroundColor: "transparent",
    backdropFilter: "blur(20px)",
  },
}

export const ContentContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "12px",
  width: "100%",
}

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
}

export const SectionHeader = {
  color: COLORS.blackRock,
  opacity: 0.7,
  width: "100%",
}

export const NetworkButton = {
  padding: "6px 12px",
  gap: "12px",
  alignItems: "center",
  justifyContent: "flex-start",
  borderRadius: "8px",
  textTransform: "none",
  minHeight: "44px",
}
