import { COLORS } from "@/theme/colors"

export const MobileNameBlockContainer = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  backgroundColor: COLORS.white,
  borderRadius: "14px",
  padding: "12px 16px",
}

export const MobileBackButton = {
  display: "flex",
  width: "fit-content",
  marginTop: "4px",
}

export const MobileBackButtonIcon = {
  fontSize: "20px",
  "& path": { fill: COLORS.greySuit },
}

export const MobileDivider = { margin: "20px 0" }

export const MobileSwitchContainer = {
  width: "100%",
  display: "flex",
  gap: "4px",
}

export const MobileSwitchButton = {
  padding: "6px 12px",
  height: "32px",
  width: "100%",

  color: COLORS.blackRock,
}
