import { COLORS } from "@/theme/colors"

export const ExternalAlertContainer = {
  width: "100%",
  display: "flex",
  gap: "10px",
  borderRadius: "12px",
  padding: "12px 16px",
  backgroundColor: COLORS.hintOfRed,
}

export const InternalAlertContainer = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px",
  borderRadius: "12px",
  backgroundColor: COLORS.hintOfRed,
  marginTop: "32px",
}

export const InternalTextContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}
