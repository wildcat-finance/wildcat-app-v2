import { COLORS } from "@/theme/colors"

export const InputLabelStyle = {
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "20px",
  color: COLORS.santasGrey,
  transform: "translate(17px, 12px)",
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
  minHeight: "44px !important",
  height: "auto !important",
  paddingRight: "8px !important",

  "& .MuiSelect-icon": {
    transform: "scale(0.8)",
    display: "block",
    top: "10px",
    right: "8px",

    "&.Mui-disabled": {
      "& path": {
        fill: COLORS.whiteLilac,
      },
    },
  },

  "& .MuiSelect-select": {
    maxWidth: "350px",
    minHeight: "42px !important",
    height: "auto",
    boxSizing: "border-box",
    padding: "9px 16px !important",
    display: "flex",
    alignItems: "center",
  },

  "&.Mui-disabled": {
    "&:hover": {
      borderColor: COLORS.whiteLilac,
      background: "transparent",
    },
  },
}

export const DeleteButtonStyle = {
  position: "absolute",
  right: "30px",
  top: "15px",
}

export const ChipBoxStyle = {
  maxWidth: "350px",
  display: "flex",
  flexWrap: "wrap",
  overflow: "hidden",
  gap: 0.5,
}

export const MenuStyle = {
  sx: {
    "& .MuiPaper-root": {
      width: "392px",
      fontFamily: "inherit",
      padding: "16px 20px 20px",
    },
  },
}

export const PaperContainer = {
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
