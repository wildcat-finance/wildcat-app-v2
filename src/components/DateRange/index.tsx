import { ChangeEvent } from "react"

import { Box, SvgIcon, TextField, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useTranslation } from "react-i18next"

import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"

import { DateRangeProps } from "./interface"
import {
  DateCalendarContainer,
  DateCalendarHeaderContainer,
  DateCalendarTextField,
  DateRangeContainer,
} from "./style"

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

export const DateRange = ({ dates, setDates }: DateRangeProps) => {
  const { t } = useTranslation()
  const { starting, ending } = dates

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

    const formattedDate = formatDateForDateRange(input.value)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={DateRangeContainer}>
        <Box sx={DateCalendarContainer}>
          <Box sx={DateCalendarHeaderContainer}>
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              {t("dateRange.startDate")}
            </Typography>
            <TextField
              sx={DateCalendarTextField}
              placeholder="01/02/1980"
              value={starting}
              onChange={(evt) => {
                onInputChange(evt, "starting")
              }}
              fullWidth
            />
          </Box>

          <DateCalendar
            slots={{
              leftArrowIcon: DateCalendarArrowLeft,
              rightArrowIcon: DateCalendarArrowRight,
            }}
            value={
              dayjs(starting, "DD/MM/YYYY").isValid()
                ? dayjs(starting, "DD/MM/YYYY")
                : null
            }
            onChange={(newDate) => {
              onCalendarChange(newDate, "starting")
            }}
            defaultValue={dates.starting}
            shouldDisableDate={shouldDisableStartDate}
          />
        </Box>
        <Box sx={DateCalendarContainer}>
          <Box sx={DateCalendarHeaderContainer}>
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              {t("dateRange.dueDate")}
            </Typography>
            <TextField
              sx={DateCalendarTextField}
              placeholder="01/02/1980"
              value={ending}
              onChange={(evt) => {
                onInputChange(evt, "ending")
              }}
              fullWidth
            />
          </Box>

          <DateCalendar
            slots={{
              leftArrowIcon: DateCalendarArrowLeft,
              rightArrowIcon: DateCalendarArrowRight,
            }}
            value={
              dayjs(ending, "DD/MM/YYYY").isValid()
                ? dayjs(ending, "DD/MM/YYYY")
                : null
            }
            onChange={(newDate) => {
              onCalendarChange(newDate, "ending")
            }}
            defaultValue={dates.ending}
            shouldDisableDate={shouldDisableEndDate}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
