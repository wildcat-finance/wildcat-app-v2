import { COLORS } from "@/theme/colors"

export const DatePickerStyle = {
  "& .mui-1bl45wc-MuiInputBase-root-MuiFilledInput-root": {
    width: "280px",
    height: "50px",
    backgroundColor: "white",
    border: "1px solid",
    borderColor: COLORS.hintOfRed,
    borderRadius: "12px",
    textDecoration: "none",
    "&:hover": {
      "&:not(.Mui-disabled, .Mui-error)": {
        "&::before": {
          border: "0px",
        },
      },
      backgroundColor: "white",
    },
    "&::before": {
      border: "none",
    },
    "&::after": {
      border: "none",
    },
  },
}

export const TypographyStyle = {
  position: "absolute",
  color: COLORS.santasGrey,
  top: "6px",
  left: "12px",
}

export const DatePickersContainer = {
  display: "flex",
  gap: "22px",
  width: "100%",
}

export const DatePickerContainer = { position: "relative", width: "100%" }
