import { COLORS } from "@/theme/colors"

export const MobileInfoSectionContainer = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  backgroundColor: COLORS.white,
  borderRadius: "14px",
  padding: "12px 16px 24px",
  marginTop: "4px",
}

export const MobileInfoContainer = {
  ...MobileInfoSectionContainer,
  height: "100%",
}

export const MobileInfoGrid = {
  display: "flex",
  flexDirection: "column",
  marginTop: "20px",
}

export const MobileInfoDivider = { margin: "12px 0" }

export const InfoContainer = {
  width: "100%",
  display: "flex",
  gap: "36px",
  marginTop: "24px",
}

export const InfoColumn = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
}

export const InfoDivider = { margin: "12px 0" }
