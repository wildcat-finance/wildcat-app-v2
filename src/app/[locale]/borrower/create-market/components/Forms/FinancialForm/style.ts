import { COLORS } from "@/theme/colors"

export const endDecorator = { color: COLORS.santasGrey }

// The theme fixes the entire TextField at 52px. Keep that input height, but
// let the field grow with wrapping validation messages beneath it.
export const repaymentField = {
  height: "auto",
  minWidth: 0,
  "& .MuiInputBase-root": {
    height: "52px",
    flexShrink: 0,
  },
  "& .MuiFormHelperText-root": {
    marginTop: "8px",
    whiteSpace: "normal",
  },
}

export const repaymentPickerLayout = {
  "& .MuiPickersLayout-contentWrapper": {
    display: { xs: "flex", sm: "grid" },
    flexDirection: "column",
    "& > .MuiDivider-vertical": {
      display: { xs: "none", sm: "block" },
    },
  },
  "& .MuiDateCalendar-root": {
    height: "auto",
    minHeight: "252px",
  },
  "& .MuiYearCalendar-root": {
    padding: "12px",
  },
  "&& .MuiMultiSectionDigitalClock-root, && .MuiMultiSectionDigitalClockSection-root":
    {
      maxHeight: { xs: "160px", sm: "280px" },
    },
  "& .MuiMultiSectionDigitalClock-root": {
    justifyContent: "center",
    borderTop: { xs: `1px solid ${COLORS.whiteLilac}`, sm: 0 },
    "& .MuiMenuItem-root": {
      fontSize: "13px",
      borderRadius: "8px",
      "&.Mui-selected": {
        backgroundColor: COLORS.cornflowerBlue,
      },
    },
  },
}
