import { COLORS } from "@/theme/colors"

export const InputContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "8px",
}

export const InputLabelContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "6px",
}

export const TooltipIcon = {
  "& path": { fill: `${COLORS.greySuit}` },
}
