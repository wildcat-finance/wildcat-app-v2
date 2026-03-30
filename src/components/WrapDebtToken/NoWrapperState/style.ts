import { COLORS } from "@/theme/colors"

export const NoWrapperStateContainer = (isMobile: boolean) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: isMobile ? "transparent" : COLORS.hintOfRed,
  padding: isMobile ? 0 : "20px",
  borderRadius: "12px",
  marginBottom: isMobile ? "20px" : "32px",
})

export const PlaceholderIcon = {
  fontSize: "20px",
  marginBottom: "10px",
  "& path": { fill: COLORS.matteSilver },
}

export const PlaceholderTitle = {
  marginBottom: "4px",
}

export const CreateButton = {
  marginTop: "20px",
}

export const QuestionsContainer = (isMobile: boolean) => ({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: isMobile ? 0 : "0px 32px",
})

export const QuestionItem = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const LearnMoreButton = (isMobile: boolean) => ({
  display: "flex",
  margin: isMobile ? "16px 0 20px 0" : "24px 0px 0px 32px",
  textDecoration: "none",
})
