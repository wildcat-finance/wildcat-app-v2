import { COLORS } from "@/theme/colors"

export const ButtonsContainer = {
  display: "flex",
  alignItems: "center",
  columnGap: "4px",
}

export const ButtonStyle = {
  padding: 0,
  "& path": {
    fill: `${COLORS.greySuit}`,
    transition: "fill 0.2s",
  },
  "& :hover": { "& path": { fill: `${COLORS.santasGrey}` } },
}
