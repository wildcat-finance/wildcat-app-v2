import { COLORS } from "@/theme/colors"

export const LenderNameContainer = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
}

export const LenderNameTextfield = {
  width: "168px",
  height: "fit-content",
  "& .MuiInputBase-root": { padding: "0 4px 0 8px" },
  "& .MuiInputBase-input.MuiFilledInput-input": { padding: "4px 0" },
}

export const LenderNameIcon = {
  padding: 0,
  "& path": {
    fill: `${COLORS.greySuit}`,
    transition: "fill 0.2s",
  },
  "& :hover": { "& path": { fill: `${COLORS.santasGrey}` } },
}
