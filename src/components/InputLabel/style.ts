import { COLORS } from "@/theme/colors"

export const InputContainer = {
  display: "flex",
  flexDirection: "column",
}

export const InputLabelContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "6px",
}

export const InputLabelTypo = {
  display: "flex",
  flexDirection: "column",
}

export const InputLabelSubtitle = {
  color: COLORS.santasGrey,
  lineHeight: "12px",
  margin: "2px 0 12px",
}

export const TooltipIcon = {
  "& path": { fill: `${COLORS.greySuit}` },
}
