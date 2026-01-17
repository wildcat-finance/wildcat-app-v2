import { COLORS } from "@/theme/colors"

export const PageContainer = {
  width: "100%",
  padding: { xs: "4px 0 0", md: "0 32.3% 12px 44px" },
}

export const AlertContainer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: "24px",
  borderRadius: "16px",
  backgroundColor: { xs: COLORS.white, md: COLORS.hintOfRed },
}

export const TypoContainer = {
  display: "flex",
  flexDirection: "column",
}

export const ButtonStyle = {
  width: "fit-content",
  height: "fit-content",
  padding: "8px 12px",
  borderRadius: "8px",
}
