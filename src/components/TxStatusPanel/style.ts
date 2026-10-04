import { COLORS } from "@/theme/colors"

export const TxStatusPanelContainer = (isMobile: boolean) => ({
  flex: 1,
  minHeight: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: isMobile ? "20px" : "8px",
  padding: isMobile ? "0 16px" : "0 24px",
})

export const TxStatusPanelHeader = {
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
}

export const TxStatusPanelCloseIcon = {
  "& path": { fill: COLORS.black },
}

export const TxStatusPanelBody = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
  padding: "20px 0",
}

export const TxStatusPanelText = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  textAlign: "center",
}

export const TxStatusPanelSubtitle = {
  color: COLORS.manate,
  maxWidth: "250px",
  textAlign: "center",
}

export const TxStatusPanelActions = (reserveLink: boolean) => ({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "100%",
  ...(reserveLink ? { minHeight: "36px" } : {}),
})

export const TxStatusSheetDialog = {
  backdropFilter: "blur(10px)",

  "& .MuiDialog-paper": {
    height: "361px",
    width: "100%",
    maxWidth: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "16px 0",
    margin: "auto 0 4px",
  },
}
