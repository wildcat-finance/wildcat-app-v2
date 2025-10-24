import { lh, pxToRem } from "@/theme/units"

export const ContentContainer = {
  minWidth: "267px",
  padding: "32px 12px 0px",
  display: "flex",
  flexDirection: "column",
}

export const MenuItemButton = {
  width: "100%",
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: "500",
  justifyContent: "flex-start",
  alignItems: "center",
}
