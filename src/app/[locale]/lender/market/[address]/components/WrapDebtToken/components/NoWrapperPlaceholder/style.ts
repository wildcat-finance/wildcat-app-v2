import { COLORS } from "@/theme/colors"

export const NoWrapperPlaceholderContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: COLORS.hintOfRed,
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "32px",
}

export const PlaceholderIcon = {
  fontSize: "20px",
  marginBottom: "10px",
  "& path": { fill: COLORS.matteSilver },
}

export const PlaceholderTitle = {
  marginBottom: "4px",
}

export const PlaceholderSubtitle = {
  marginBottom: "20px",
}

export const QuestionsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "0px 32px",
}

export const QuestionItem = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const LearnMoreButton = {
  display: "flex",
  margin: "24px 0px 0px 32px",
  textDecoration: "none",
}
