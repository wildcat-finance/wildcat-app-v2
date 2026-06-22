import { COLORS } from "@/theme/colors"

export const LenderProfileOverviewContainer = {
  display: "flex",
  flexDirection: "column",
  padding: { xs: "12px 16px", md: "0px" },
  gap: { xs: "4px", md: "36px" },
}

export const LenderProfileOverviewSection = {
  display: "flex",
  flexDirection: "column",
  borderRadius: { xs: "14px", md: "none" },
  backgroundColor: { xs: COLORS.white, md: "transparent" },
}

export const ProfileOverviewTitleContainer = {
  display: "flex",
  flexDirection: "column",
  gap: { xs: 0, md: "4px" },
  marginBottom: { xs: "4px", md: "24px" },
}
