import { COLORS } from "@/theme/colors"

export const ContentContainer = {
  height: "100%",
  minWidth: "267px",
  padding: "32px 12px 0px",
  display: "flex",
  flexDirection: "column",
}

export const BackButton = {
  color: COLORS.greySuit,
  justifyContent: "flex-start",
  marginBottom: "12px",
}

export const BackButtonIcon = {
  marginRight: "4px",
  "& path": { fill: `${COLORS.greySuit}` },
}

export const MenuItemButton = {
  width: "100%",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: "500",
  justifyContent: "flex-start",
  backgroundColor: COLORS.whiteSmoke,

  "&:hover": {
    backgroundColor: COLORS.whiteSmoke,
  },
}
