import { COLORS } from "@/theme/colors"

export const FormControlContainer = { position: "relative", width: "260px" }

export const SelectContainer = {
  fontSize: "11px",
  transform: "translate(29.15px, 6px) scale(1)",
  "&.Mui-focused": {
    display: "none",
  },
  "&.MuiFormLabel-filled": {
    display: "none",
  },
}

export const SearchIcon = {
  "& path": { fill: `${COLORS.greySuit}` },

  position: "absolute",
  top: "29.5%",
  left: "10px",
  zIndex: -1,
}
