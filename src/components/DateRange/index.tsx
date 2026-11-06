import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  Popover,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import customParseFormat from "dayjs/plugin/customParseFormat"
import { useTranslation } from "react-i18next"

import CalendarIcon from "@/assets/icons/calendar_icon.svg"
import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"

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

dayjs.extend(customParseFormat)

// Utility function to format date string to 'DD/MM/YYYY'
const formatDateForDateRange = (input: string | undefined) => {
  // delete all except digits
  if (input) {
    const digits = input.replace(/\D/g, "")

    // format to DD/MM/YYYY
    let formattedValue = ""
    if (digits.length > 0) {
      formattedValue += digits.substring(0, 2) // day
      if (digits.length >= 2) {
        formattedValue += `/${digits.substring(2, 4)}` // month
      }
      if (digits.length >= 4) {
        formattedValue += `/${digits.substring(4, 8)}` // year
      }
    }

    return formattedValue
  }
  return undefined
}

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
  const { starting, ending } = dates
  const [calendarTarget, setCalendarTarget] = useState<{
    field: "starting" | "ending"
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

  const shouldDisableStartDate = (date: dayjs.Dayjs): boolean =>
    ending ? date.isAfter(dayjs(ending, "DD/MM/YYYY"), "day") : false

  const shouldDisableEndDate = (date: dayjs.Dayjs): boolean =>
    starting ? date.isBefore(dayjs(starting, "DD/MM/YYYY"), "day") : false

  const onInputChange = (
    evt: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: "starting" | "ending",
  ) => {
    const input = evt.target
    const cursorPosition = input.selectionStart
    const originalLength = input.value.length

    const formattedDate = formatDateForDateRange(input.value) ?? null

    setDates((prev) => {
      if (field === "starting") {
        if (
          prev.ending &&
          dayjs(formattedDate, "DD/MM/YYYY").isAfter(
            dayjs(prev.ending, "DD/MM/YYYY"),
          )
        ) {
          return { ...prev, starting: prev.ending }
        }
        return { ...prev, starting: formattedDate }
      }
      if (field === "ending") {
        if (
          prev.starting &&
          dayjs(formattedDate, "DD/MM/YYYY").isBefore(
            dayjs(prev.starting, "DD/MM/YYYY"),
          )
        ) {
          return { ...prev, ending: prev.starting }
        }
        return { ...prev, ending: formattedDate }
      }
      return prev
    })

    setTimeout(() => {
      if (formattedDate) {
        const newLength = formattedDate.length

        if (cursorPosition !== null) {
          const newCursorPosition =
            cursorPosition + (newLength - originalLength)
          input.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }
    }, 0)
  }

  const onCalendarChange = (
    newDate: dayjs.Dayjs | null,
    field: "starting" | "ending",
  ) => {
    if (newDate) {
      const formattedDate = newDate.format("DD/MM/YYYY")
      setDates((prev) => ({ ...prev, [field]: formattedDate }))
    }
  }

  const parseValue = (value: string | null) =>
    dayjs(value, "DD/MM/YYYY").isValid() ? dayjs(value, "DD/MM/YYYY") : null

  const renderCalendar = (field: "starting" | "ending") => (
    <DateCalendar
      slots={{
        leftArrowIcon: DateCalendarArrowLeft,
        rightArrowIcon: DateCalendarArrowRight,
      }}
      value={parseValue(dates[field])}
      onChange={(newDate, selectionState) => {
        onCalendarChange(newDate, field)
        if (calendar === "popover" && selectionState === "finish") {
          closeCalendar()
        }
      }}
      disabled={disabled}
      sx={calendar === "popover" ? DatePopoverCalendar : undefined}
      shouldDisableDate={
        field === "starting" ? shouldDisableStartDate : shouldDisableEndDate
      }
    />
  )

  const renderField = (field: "starting" | "ending") => {
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
          <TextField
            sx={
              calendar === "popover"
                ? DatePopoverTextField
                : DateCalendarTextField
            }
            size={calendar === "popover" ? "medium" : undefined}
            placeholder="01/02/1980"
            value={dates[field] ?? ""}
            InputProps={{
              inputProps: { "aria-label": label },
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
            onChange={(evt) => {
              onInputChange(evt, field)
            }}
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
