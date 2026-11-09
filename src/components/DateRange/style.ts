import { COLORS } from "@/theme/colors"

export const DateRangeContainer = {
  display: "flex",
  flexWrap: "wrap",
  gap: "20px 28px",
}

export const DateCalendarContainer = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 260px",
  minWidth: 0,
  gap: "16px",
}

export const DateCalendarTextField = {
  "& .MuiInputBase-root": {
    borderRadius: "10px",
    width: "100%",
  },

  "& .MuiInputBase-input": {
    padding: "12px 16px",
  },
}

export const DateCalendarHeaderContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}

export const DatePopoverTextField = {
  "& .MuiInputBase-root": {
    paddingRight: "8px",
  },
}

export const DateCalendarButton = {
  color: COLORS.greySuit,
  "&:hover": { color: COLORS.blackRock },
  "& path": { stroke: "currentColor" },
}

export const CALENDAR_POPOVER_GAP = 4
export const CALENDAR_POPOVER_MAX_HEIGHT = 300

export const DateCalendarPopoverPaper = (
  placement: "above" | "below",
  bottom: number,
) => ({
  padding: "10px 12px 12px",
  ...(placement === "above"
    ? {
        marginTop: 0,
        top: "auto !important",
        bottom: `${bottom}px`,
        transformOrigin: "left bottom !important",
      }
    : { marginTop: `${CALENDAR_POPOVER_GAP}px` }),
})

export const DatePopoverRangeContainer = {
  ...DateRangeContainer,
  gap: "16px 12px",
}

const CALENDAR_MAX_WEEKS = 6
const CALENDAR_WEEK_HEIGHT = 22
const CALENDAR_WEEK_GAP = 4

export const DatePopoverCalendar = {
  height: "auto",
  maxHeight: "none",
  "& .MuiPickersSlideTransition-root.MuiDayCalendar-slideTransition": {
    minHeight: `${
      CALENDAR_MAX_WEEKS * (CALENDAR_WEEK_HEIGHT + CALENDAR_WEEK_GAP) -
      CALENDAR_WEEK_GAP
    }px`,
    overflow: "hidden",
    "& > *:not(.MuiPickersSlideTransition-slideExit)": {
      position: "relative",
    },
  },
}
