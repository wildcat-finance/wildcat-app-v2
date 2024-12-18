import { COLORS } from "@/theme/colors"

export const ContentContainer = {
  minHeight: "calc(100vh - 43px - 43px - 60px)",
  width: "267px",
  borderRight: `1px solid ${COLORS.blackRock006}`,
  padding: "32px 12px 0px",
  display: "flex",
  flexDirection: "column",
}

export const MenuItemButton = {
  letterSpacing: "0.01px",
  padding: "8px 12px",

  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "500",
  justifyContent: "flex-start",
}

export const MenuItemButtonSelected = {
  letterSpacing: "0.01px",
  padding: "8px 12px",

  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "500",
  justifyContent: "flex-start",

  boxShadow: "none",
  backgroundColor: COLORS.whiteSmoke,
}
