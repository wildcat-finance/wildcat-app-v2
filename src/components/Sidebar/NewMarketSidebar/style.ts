import { COLORS } from "@/theme/colors"

export const ContentContainer = {
  minHeight: "calc(100vh - 82px - 43px)",
  minWidth: "267px",
  borderRight: `1px solid ${COLORS.blackRock006}`,
  padding: "32px 12px 0px",
  display: "flex",
  flexDirection: "column",
}

export const BackButton = {
  color: COLORS.greySuit,
  justifyContent: "flex-start",
  marginBottom: "14px",
}

export const BackButtonIcon = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.greySuit}` },
}

export const MenuItemButton = {
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "500",
  justifyContent: "flex-start",
}

export const MenuItemButtonSelected = {
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "500",
  justifyContent: "flex-start",
  boxShadow: "none",
  backgroundColor: COLORS.blackRock03,
}
