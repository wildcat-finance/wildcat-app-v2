import { COLORS } from "@/theme/colors"

export const DatePickerStyle = {
  "& .MuiInputBase-root.MuiFilledInput-root": {
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: 500,

    width: "280px",
    height: "50px",
    backgroundColor: "white",
    border: "1px solid",
    borderColor: COLORS.hintOfRed,
    borderRadius: "12px",
    textDecoration: "none",

    "& .MuiTypography-root ": {
      padding: "8px 0 0 16px",
    },

    "& .MuiInputBase-inputAdornedEnd": {
      padding: "24px 0 8px 16px",
    },

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
  left: "17px",
}

export const DatePickersContainer = {
  display: "flex",
  gap: "22px",
  width: "100%",
}

export const DatePickerContainer = { position: "relative", width: "100%" }
