import { COLORS } from "@/theme/colors"

export const InputLabelStyle = {
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: "20px",
  color: COLORS.santasGrey,
  transform: "translate(17px, 9px)",
  pointerEvents: "none",

  "&.MuiInputLabel-shrink": {
    display: "block",

    "&.Mui-focused": {
      display: "none",
    },
  },

  "&.MuiFormLabel-filled": {
    display: "none",
  },
}

export const SelectStyle = {
  padding: "0 !important",
  minHeight: "38px !important",

  "& .MuiSelect-select": {
    height: "auto",
    minHeight: "36px !important",
    boxSizing: "border-box",
    padding: "8px 10px 8px 6px !important",
    display: "flex",
    alignItems: "center",
  },

  "& .MuiSelect-icon": {
    display: "block",
    top: "4px",
    transform: "translate(3.5px, 3px) scale(0.7)",

    "&.MuiSelect-iconOpen": {
      transform: "translate(3.5px, 3px) scale(0.7) rotate(180deg)",
    },
  },
}

export const DeleteButtonStyle = {
  position: "absolute",
  right: "22px",
  top: "12px",
  transform: "scale(0.9)",
}

export const ChipContainer = {
  display: "flex",
  flexWrap: "wrap",
  overflow: "hidden",
  gap: 0.5,
}

export const MenuStyle = {
  sx: {
    "& .MuiPaper-root": {
      width: "295px",
      fontFamily: "inherit",
      padding: "12px",
    },
  },
}

export const MenuBox = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  marginBottom: "16px",
}

export const VariantsContainer = {
  height: "132px",
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "0 10px",
}
