import { COLORS } from "@/theme/colors"

export const ContentContainer = {
  width: "225px",
  padding: "12px",
  borderRadius: "12px",
  display: "flex",
  justifyContent: "space-between",
  backgroundColor: COLORS.blackRock03,
}

export const TypoContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "6px",
}

export const Description = { width: "170px" }

export const TimeAgoContainer = {
  display: "flex",
  columnGap: "4px",
  alignItems: "center",
}

export const Dot = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: COLORS.carminePink,
}

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "6px",
}

export const PenaltyDescription = { width: "170px", color: COLORS.santasGrey }
