import { COLORS } from "@/theme/colors"

export const FooterContainer = {
  width: "100%",
  marginTop: "auto",
  paddingTop: "32px",
  position: "sticky",
  bottom: 0,
  zIndex: 1,
  pointerEvents: "none",
}

export const FooterBar = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  padding: "24px 0 28px",
  backgroundColor: COLORS.white,
  borderTop: `1px solid ${COLORS.blackRock006}`,
  pointerEvents: "auto",
}
