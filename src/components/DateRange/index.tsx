import { useEffect, useState } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  Popover,
  SvgIcon,
  Typography,
} from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { DateField } from "@mui/x-date-pickers/DateField"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { Dayjs } from "dayjs"
import { useTranslation } from "react-i18next"

import CalendarIcon from "@/assets/icons/calendar_icon.svg"
import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { COLORS } from "@/theme/colors"

import { DateRangeProps } from "./interface"
import {
  DateCalendarButton,
  DateCalendarContainer,
  DateCalendarHeaderContainer,
  CALENDAR_POPOVER_GAP,
  CALENDAR_POPOVER_MAX_HEIGHT,
  DateCalendarPopoverPaper,
  DateCalendarTextField,
  DateRangeContainer,
  DatePopoverCalendar,
  DatePopoverRangeContainer,
  DatePopoverTextField,
} from "./style"

type DateRangeField = "starting" | "ending"

// Only a finished date can bound the other field or be shown on a calendar.
const complete = (date: Dayjs | null) => (date?.isValid() ? date : undefined)

const DateCalendarArrowLeft = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    fontSize="small"
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowRight = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    fontSize="small"
    style={{ rotate: "180deg" }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

export const DateRange = ({
  dates,
  setDates,
  disabled = false,
  calendar = "inline",
}: DateRangeProps) => {
  const { t } = useTranslation()
  const starting = complete(dates.starting)
  const ending = complete(dates.ending)
  // Shown on both fields and never corrected for the user: what was typed stays.
  const isOutOfOrder = Boolean(
    starting && ending && starting.isAfter(ending, "day"),
  )
  const [calendarTarget, setCalendarTarget] = useState<{
    field: DateRangeField
    anchor: HTMLElement
    placement: "above" | "below"
    bottom: number
  } | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const closeCalendar = () => setIsCalendarOpen(false)

  const measureAnchor = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    return {
      placement:
        rect.top >= CALENDAR_POPOVER_MAX_HEIGHT
          ? ("above" as const)
          : ("below" as const),
      bottom:
        document.documentElement.clientHeight - rect.top + CALENDAR_POPOVER_GAP,
    }
  }

  useEffect(() => {
    if (!isCalendarOpen) return undefined
    const onResize = () =>
      setCalendarTarget((current) =>
        current ? { ...current, ...measureAnchor(current.anchor) } : current,
      )
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [isCalendarOpen])

  const setDate = (field: DateRangeField, date: Dayjs | null) =>
    setDates((prev) => ({ ...prev, [field]: date }))

  const renderCalendar = (field: DateRangeField) => (
    <DateCalendar
      slots={{
        leftArrowIcon: DateCalendarArrowLeft,
        rightArrowIcon: DateCalendarArrowRight,
      }}
      value={complete(dates[field]) ?? null}
      onChange={(newDate, selectionState) => {
        if (newDate) setDate(field, newDate)
        if (calendar === "popover" && selectionState === "finish") {
          closeCalendar()
        }
      }}
      disabled={disabled}
      sx={calendar === "popover" ? DatePopoverCalendar : undefined}
      minDate={field === "ending" ? starting : undefined}
      maxDate={field === "starting" ? ending : undefined}
    />
  )

  const renderField = (field: DateRangeField) => {
    const label =
      field === "starting" ? t("dateRange.startDate") : t("dateRange.dueDate")

    return (
      <Box sx={DateCalendarContainer}>
        <Box sx={DateCalendarHeaderContainer}>
          <Typography
            sx={{ padding: "0px 4px" }}
            variant="text3"
            color={COLORS.santasGrey}
          >
            {label}
          </Typography>
          {/* Day, month and year are edited as separate sections, so changing
              one never shifts digits into another. */}
          <DateField
            sx={
              calendar === "popover"
                ? DatePopoverTextField
                : DateCalendarTextField
            }
            // Stated rather than left to the theme defaults: the theme styles
            // text fields by variant and size, and the date field only passes
            // on the ones it is given.
            variant="filled"
            size={calendar === "popover" ? "medium" : "regular"}
            format="DD/MM/YYYY"
            value={dates[field]}
            onChange={(date) => setDate(field, date)}
            slotProps={{
              textField: {
                // Set explicitly: by default the field turns red on the first
                // keystroke, because an unfinished date is an invalid one.
                error: isOutOfOrder,
                inputProps: { "aria-label": label },
              },
            }}
            InputProps={{
              endAdornment:
                calendar === "popover" ? (
                  <InputAdornment position="end">
                    <IconButton
                      disableRipple
                      disabled={disabled}
                      aria-label={label}
                      aria-haspopup="dialog"
                      aria-expanded={
                        isCalendarOpen && calendarTarget?.field === field
                      }
                      onClick={(event) => {
                        const anchor =
                          event.currentTarget.closest<HTMLElement>(
                            ".MuiInputBase-root",
                          ) ?? event.currentTarget
                        setCalendarTarget({
                          field,
                          anchor,
                          ...measureAnchor(anchor),
                        })
                        setIsCalendarOpen(true)
                      }}
                      sx={DateCalendarButton}
                    >
                      <SvgIcon fontSize="medium">
                        <CalendarIcon />
                      </SvgIcon>
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
            }}
            disabled={disabled}
            fullWidth
          />
        </Box>

        {calendar === "inline" && renderCalendar(field)}
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={
          calendar === "popover"
            ? DatePopoverRangeContainer
            : DateRangeContainer
        }
      >
        {renderField("starting")}
        {renderField("ending")}
      </Box>
      {calendar === "popover" && (
        <Popover
          open={isCalendarOpen && Boolean(calendarTarget)}
          anchorEl={calendarTarget?.anchor}
          onClose={closeCalendar}
          anchorOrigin={{
            vertical: calendarTarget?.placement === "below" ? "bottom" : "top",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: calendarTarget?.placement === "below" ? "top" : "bottom",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: DateCalendarPopoverPaper(
                calendarTarget?.placement ?? "above",
                calendarTarget?.bottom ?? 0,
              ),
            },
          }}
        >
          {calendarTarget && renderCalendar(calendarTarget.field)}
        </Popover>
      )}
    </LocalizationProvider>
  )
}
