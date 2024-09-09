import { COLORS } from "@/theme/colors"

export const InputLabelStyle = {
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: "20px",
  color: COLORS.santasGrey,
  transform: "translate(33px, 6px)",
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

export const ChipContainer = {
  height: "20px",
  display: "flex",
  flexWrap: "wrap",
  overflow: "hidden",
  gap: 0.5,
}

export const MenuStyle = {
  sx: {
    "& .MuiPaper-root": {
      width: "312px",
      fontFamily: "inherit",
      padding: "16px 20px 20px",
      marginTop: "2px",
      marginLeft: "45px",
    },
  },
}

export const SelectStyle = {
  width: "220px",
  height: "32px",
  "& .MuiSelect-icon": {
    display: "block",
    top: "5px",
    transform: "translate(3.5px, 0px) scale(0.7)",
    "&.MuiSelect-iconOpen": {
      transform: "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
    },

    "& path": { fill: `${COLORS.santasGrey}` },
  },
}
