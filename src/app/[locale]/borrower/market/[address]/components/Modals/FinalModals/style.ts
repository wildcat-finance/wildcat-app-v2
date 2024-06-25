import { COLORS } from "@/theme/colors"

export const FinalModalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
}

export const FinalModalCloseButton = { "& path": { fill: `${COLORS.black}` } }

export const FinalModalContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}

export const FinalModalMainContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  rowGap: "24px",
}

export const FinalModalTypoBox = {
  display: "flex",
  flexDirection: "column",
  rowGap: "8px",
  alignItems: "center",
}

export const FinalModalSubtitle = {
  color: COLORS.santasGrey,
  width: "250px",
  textAlign: "center",
}
