import { COLORS } from "@/theme/colors"

export const PageContainer = {
  width: "100%",
  padding: { xs: "4px 0 0", md: "16px 16px 0 16px" },
}

export const AlertContainer = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: "24px",
  borderRadius: "16px",
  backgroundColor: { xs: COLORS.white, md: COLORS.hintOfRed },
}

export const ButtonStyle = {
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: "8px",
}
